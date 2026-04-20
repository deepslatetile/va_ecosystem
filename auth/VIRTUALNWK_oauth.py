from flask import Blueprint, redirect, request, session, jsonify
import requests
from database import get_db
import secrets
from datetime import datetime
from urllib.parse import urlencode
from services.utils import login_required
from services.db_utils import handle_db_locks

VIRTUALNWK_bp = Blueprint('VIRTUALNWK', __name__)

@VIRTUALNWK_bp.route('/VIRTUALNWK')
@handle_db_locks(max_retries=5)
def auth_VIRTUALNWK():
    from app import app
    if not app.config['VIRTUALNWK_CLIENT_ID'] or not app.config['VIRTUALNWK_CLIENT_SECRET']:
        return jsonify({"error": "VIRTUALNWK OAuth is not configured"}), 500

    params = {
        'client_id': app.config['VIRTUALNWK_CLIENT_ID'],
        'redirect_uri': app.config['VIRTUALNWK_REDIRECT_URI'],
        'response_type': 'code',
        'scope': 'openid profile',
        'state': secrets.token_urlsafe(16)
    }

    auth_url = f"{app.config['VIRTUALNWK_AUTH_URL']}?{urlencode(params)}"
    return redirect(auth_url)

@VIRTUALNWK_bp.route('/VIRTUALNWK/callback')
@handle_db_locks(max_retries=5)
def auth_VIRTUALNWK_callback():
    from app import app
    if not app.config['VIRTUALNWK_CLIENT_ID'] or not app.config['VIRTUALNWK_CLIENT_SECRET']:
        return redirect('/profile?error=VIRTUALNWK_not_configured')

    try:
        code = request.args.get('code')
        if not code:
            return redirect('/profile?error=VIRTUALNWK_no_code')

        if 'user_id' not in session:
            return redirect('/login?redirect=/auth/VIRTUALNWK')

        user_id = session['user_id']

        token_data = {
            'client_id': app.config['VIRTUALNWK_CLIENT_ID'],
            'client_secret': app.config['VIRTUALNWK_CLIENT_SECRET'],
            'grant_type': 'authorization_code',
            'code': code,
            'redirect_uri': app.config['VIRTUALNWK_REDIRECT_URI']
        }

        headers = {'Content-Type': 'application/x-www-form-urlencoded'}
        VIRTUALNWK_TOKEN_URL = 'https://apis.VIRTUALNWK.com/oauth/v1/token'
        token_response = requests.post(VIRTUALNWK_TOKEN_URL, data=token_data, headers=headers)
        token_response.raise_for_status()
        token_json = token_response.json()

        access_token = token_json['access_token']
        refresh_token = token_json.get('refresh_token')
        expires_in = token_json.get('expires_in', 24 * 60 * 60)

        user_headers = {'Authorization': f'Bearer {access_token}'}
        VIRTUALNWK_API_URL = 'https://apis.VIRTUALNWK.com/oauth/v1/userinfo'
        user_response = requests.get(VIRTUALNWK_API_URL, headers=user_headers)
        user_response.raise_for_status()
        VIRTUALNWK_user = user_response.json()

        if not VIRTUALNWK_user.get('sub'):
            return redirect('/profile?error=VIRTUALNWK_no_user_id')

        db = get_db()
        cursor = db.cursor(dictionary=True)

        cursor.execute('''
                  SELECT user_id
                  FROM oauth_connections
                  WHERE provider = ?
                    AND provider_user_id = ?
                    AND user_id != ?
                  ''', ('VIRTUALNWK', VIRTUALNWK_user['sub'], user_id))

        existing_connection = cursor.fetchone()
        if existing_connection:
            return redirect('/profile?error=VIRTUALNWK_already_linked')

        cursor.execute('''
                  SELECT id
                  FROM oauth_connections
                  WHERE user_id = ?
                    AND provider = 'VIRTUALNWK'
                  ''', (user_id,))

        current_connection = cursor.fetchone()

        if current_connection:
            cursor.execute('''
                      UPDATE oauth_connections
                      SET access_token  = ?,
                          refresh_token = ?,
                          expires_at    = ?
                      WHERE user_id = ?
                        AND provider = 'VIRTUALNWK'
                      ''', (
                          access_token,
                          refresh_token,
                          int(datetime.now().timestamp()) + expires_in,
                          user_id
                      ))
        else:
            cursor.execute('''
                      INSERT INTO oauth_connections (user_id, provider, provider_user_id, access_token, refresh_token,
                                                     expires_at, created_at)
                      VALUES (?, ?, ?, ?, ?, ?, ?)
                      ''', (
                          user_id,
                          'VIRTUALNWK',
                          VIRTUALNWK_user['sub'],
                          access_token,
                          refresh_token,
                          int(datetime.now().timestamp()) + expires_in,
                          int(datetime.now().timestamp())
                      ))

        cursor.execute('''
                  UPDATE users
                  SET virtual_id = ?
                  WHERE id = ?
                  ''', (VIRTUALNWK_user['sub'], user_id))

        db.commit()
        return redirect('/profile?success=VIRTUALNWK_linked')

    except requests.RequestException as e:
        print(f"VIRTUALNWK OAuth error: {e}")
        return redirect('/profile?error=VIRTUALNWK_auth_failed')
    except Exception as e:
        print(f"Unexpected error: {e}")
        return redirect('/profile?error=VIRTUALNWK_unexpected_error')

@VIRTUALNWK_bp.route('/VIRTUALNWK/connection', methods=['GET', 'DELETE'])
@login_required
@handle_db_locks(max_retries=5)
def VIRTUALNWK_connection():
    user_id = session['user_id']
    try:
        db = get_db()
        cursor = db.cursor(dictionary=True)

        if request.method == 'GET':
            cursor.execute('''
                      SELECT provider_user_id, created_at, expires_at
                      FROM oauth_connections
                      WHERE user_id = ?
                        AND provider = 'VIRTUALNWK'
                      ''', (user_id,))

            connection = cursor.fetchone()

            if connection:
                return jsonify({
                    "connected": True,
                    "provider_user_id": connection['provider_user_id'],
                    "connected_at": connection['created_at'],
                    "expires_at": connection['expires_at']
                }), 200
            else:
                return jsonify({"connected": False}), 200

        elif request.method == 'DELETE':
            cursor.execute('''
                      DELETE
                      FROM oauth_connections
                      WHERE user_id = ?
                        AND provider = 'VIRTUALNWK'
                      ''', (user_id,))

            deleted_count = cursor.rowcount
            db.commit()

            if deleted_count > 0:
                return jsonify({"message": "VIRTUALNWK connection removed successfully"}), 200
            else:
                return jsonify({"error": "No VIRTUALNWK connection found"}), 404

    except Exception as e:
        print(f"VIRTUALNWK connection error: {e}")
        return jsonify({"error": "Something went wrong"}), 500

@VIRTUALNWK_bp.route('/VIRTUALNWK/userinfo', methods=['GET'])
@login_required
@handle_db_locks(max_retries=5)
def VIRTUALNWK_userinfo():
    user_id = session['user_id']
    try:
        db = get_db()
        cursor = db.cursor(dictionary=True)

        cursor.execute('''
                  SELECT access_token, expires_at
                  FROM oauth_connections
                  WHERE user_id = ?
                    AND provider = 'VIRTUALNWK'
                  ''', (user_id,))

        connection = cursor.fetchone()
        if not connection:
            return jsonify({"error": "VIRTUALNWK account not connected"}), 404

        access_token, expires_at = connection['access_token'], connection['expires_at']
        if expires_at and expires_at < datetime.now().timestamp():
            return jsonify({"error": "VIRTUALNWK token expired, please reconnect"}), 401

        headers = {'Authorization': f'Bearer {access_token}'}
        VIRTUALNWK_API_URL = 'https://apis.VIRTUALNWK.com/oauth/v1/userinfo'
        user_response = requests.get(VIRTUALNWK_API_URL, headers=headers)

        if user_response.status_code != 200:
            return jsonify({"error": "Failed to fetch VIRTUALNWK user info"}), 500

        VIRTUALNWK_user = user_response.json()

        return jsonify({
            "VIRTUALNWK_user": {
                "id": VIRTUALNWK_user.get('sub'),
                "name": VIRTUALNWK_user.get('name'),
                "nickname": VIRTUALNWK_user.get('nickname'),
                "preferred_username": VIRTUALNWK_user.get('preferred_username'),
                "profile": VIRTUALNWK_user.get('profile')
            }
        }), 200

    except Exception as e:
        print(f"VIRTUALNWK userinfo error: {e}")
        return jsonify({"error": "Something went wrong"}), 500

@VIRTUALNWK_bp.route('/VIRTUALNWK/disconnect', methods=['POST'])
@login_required
@handle_db_locks(max_retries=5)
def VIRTUALNWK_disconnect():
    user_id = session['user_id']
    try:
        db = get_db()
        cursor = db.cursor(dictionary=True)

        cursor.execute('''
                  DELETE
                  FROM oauth_connections
                  WHERE user_id = ?
                    AND provider = 'VIRTUALNWK'
                  ''', (user_id,))

        deleted_count = cursor.rowcount
        db.commit()

        if deleted_count > 0:
            return jsonify({"message": "VIRTUALNWK account disconnected successfully"}), 200
        else:
            return jsonify({"error": "No VIRTUALNWK connection found"}), 404

    except Exception as e:
        print(f"VIRTUALNWK disconnect error: {e}")
        return jsonify({"error": "Failed to disconnect VIRTUALNWK account"}), 500

def get_VIRTUALNWK_user_info(user_id):
    try:
        db = get_db()
        cursor = db.cursor(dictionary=True)

        cursor.execute('''
                  SELECT access_token, expires_at
                  FROM oauth_connections
                  WHERE user_id = ?
                    AND provider = 'VIRTUALNWK'
                  ''', (user_id,))

        connection = cursor.fetchone()

        if not connection:
            return None

        access_token, expires_at = connection['access_token'], connection['expires_at']
        if expires_at and expires_at < datetime.now().timestamp():
            return None

        headers = {'Authorization': f'Bearer {access_token}'}
        VIRTUALNWK_API_URL = 'https://apis.VIRTUALNWK.com/oauth/v1/userinfo'
        user_response = requests.get(VIRTUALNWK_API_URL, headers=headers)

        if user_response.status_code == 200:
            return user_response.json()
        else:
            return None

    except Exception as e:
        print(f"Error getting VIRTUALNWK user info: {e}")
        return None

@VIRTUALNWK_bp.route('/api/internal/VIRTUALNWK_info', methods=['GET'])
@login_required
@handle_db_locks(max_retries=5)
def internal_VIRTUALNWK_info():
    user_id = session['user_id']
    VIRTUALNWK_info = get_VIRTUALNWK_user_info(user_id)

    if VIRTUALNWK_info:
        return jsonify({
            "success": True,
            "data": VIRTUALNWK_info
        }), 200
    else:
        return jsonify({
            "success": False,
            "error": "Could not fetch VIRTUALNWK user info"
        }), 400
        