from flask import Blueprint, redirect, request, session, jsonify
import requests
from database import get_db
import secrets
from datetime import datetime
from urllib.parse import urlencode
from services.utils import login_required
from services.db_utils import handle_db_locks

SOCIALNWK_bp = Blueprint('SOCIALNWK', __name__)

@SOCIALNWK_bp.route('/SOCIALNWK')
@handle_db_locks(max_retries=5)
def auth_SOCIALNWK():
    from app import app
    if not app.config['SOCIALNWK_CLIENT_ID'] or not app.config['SOCIALNWK_CLIENT_SECRET']:
        return jsonify({"error": "SOCIALNWK OAuth is not configured"}), 500

    params = {
        'client_id': app.config['SOCIALNWK_CLIENT_ID'],
        'redirect_uri': app.config['SOCIALNWK_REDIRECT_URI'],
        'response_type': 'code',
        'scope': 'identify guilds',
        'state': secrets.token_urlsafe(16)
    }

    auth_url = f"{app.config['SOCIALNWK_AUTH_URL']}?{urlencode(params)}"
    return redirect(auth_url)

@SOCIALNWK_bp.route('/SOCIALNWK/callback')
@handle_db_locks(max_retries=5)
def auth_SOCIALNWK_callback():
    from app import app
    if not app.config['SOCIALNWK_CLIENT_ID'] or not app.config['SOCIALNWK_CLIENT_SECRET']:
        return redirect('/profile?error=SOCIALNWK_not_configured')

    try:
        code = request.args.get('code')
        if not code:
            return redirect('/profile?error=SOCIALNWK_no_code')

        if 'user_id' not in session:
            return redirect('/login?redirect=/auth/SOCIALNWK')

        user_id = session['user_id']

        token_data = {
            'client_id': app.config['SOCIALNWK_CLIENT_ID'],
            'client_secret': app.config['SOCIALNWK_CLIENT_SECRET'],
            'grant_type': 'authorization_code',
            'code': code,
            'redirect_uri': app.config['SOCIALNWK_REDIRECT_URI']
        }

        headers = {'Content-Type': 'application/x-www-form-urlencoded'}
        SOCIALNWK_TOKEN_URL = 'https://SOCIALNWK.com/api/oauth2/token'
        token_response = requests.post(SOCIALNWK_TOKEN_URL, data=token_data, headers=headers)
        token_response.raise_for_status()
        token_json = token_response.json()

        access_token = token_json['access_token']
        refresh_token = token_json.get('refresh_token')
        expires_in = token_json.get('expires_in', 24 * 60 * 60)

        user_headers = {'Authorization': f'Bearer {access_token}'}
        SOCIALNWK_API_URL = 'https://SOCIALNWK.com/api/v10'
        user_response = requests.get(f'{SOCIALNWK_API_URL}/users/@me', headers=user_headers)
        user_response.raise_for_status()
        SOCIALNWK_user = user_response.json()

        db = get_db()
        cursor = db.cursor(dictionary=True)

        cursor.execute('''
                  SELECT user_id
                  FROM oauth_connections
                  WHERE provider = ?
                    AND provider_user_id = ?
                    AND user_id != ?
                  ''', ('SOCIALNWK', SOCIALNWK_user['id'], user_id))

        existing_connection = cursor.fetchone()
        if existing_connection:
            return redirect('/profile?error=SOCIALNWK_already_linked')

        cursor.execute('''
                  SELECT id
                  FROM oauth_connections
                  WHERE user_id = ?
                    AND provider = 'SOCIALNWK'
                  ''', (user_id,))

        current_connection = cursor.fetchone()

        if current_connection:
            cursor.execute('''
                      UPDATE oauth_connections
                      SET access_token  = ?,
                          refresh_token = ?,
                          expires_at    = ?
                      WHERE user_id = ?
                        AND provider = 'SOCIALNWK'
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
                          'SOCIALNWK',
                          SOCIALNWK_user['id'],
                          access_token,
                          refresh_token,
                          int(datetime.now().timestamp()) + expires_in,
                          int(datetime.now().timestamp())
                      ))

        cursor.execute('''
                  UPDATE users
                  SET social_id = ?
                  WHERE id = ?
                  ''', (SOCIALNWK_user['id'], user_id))

        db.commit()
        return redirect('/profile?success=SOCIALNWK_linked')

    except requests.RequestException as e:
        print(f"SOCIALNWK OAuth error: {e}")
        return redirect('/profile?error=SOCIALNWK_auth_failed')
    except Exception as e:
        print(f"Unexpected error: {e}")
        return redirect('/profile?error=SOCIALNWK_unexpected_error')

@SOCIALNWK_bp.route('/SOCIALNWK/connection', methods=['GET', 'DELETE'])
@login_required
@handle_db_locks(max_retries=5)
def SOCIALNWK_connection():
    user_id = session['user_id']
    try:
        db = get_db()
        cursor = db.cursor(dictionary=True)

        if request.method == 'GET':
            cursor.execute('''
                      SELECT provider_user_id, created_at, expires_at
                      FROM oauth_connections
                      WHERE user_id = ?
                        AND provider = 'SOCIALNWK'
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
                        AND provider = 'SOCIALNWK'
                      ''', (user_id,))

            cursor.execute('''
                      UPDATE users 
                      SET social_id = NULL 
                      WHERE id = ?
                      ''', (user_id,))

            deleted_count = cursor.rowcount
            db.commit()

            if deleted_count > 0:
                return jsonify({"message": "SOCIALNWK connection removed successfully"}), 200
            else:
                return jsonify({"error": "No SOCIALNWK connection found"}), 404

    except Exception as e:
        print(f"SOCIALNWK connection error: {e}")
        return jsonify({"error": "Something went wrong"}), 500

@SOCIALNWK_bp.route('/SOCIALNWK/userinfo', methods=['GET'])
@login_required
@handle_db_locks(max_retries=5)
def SOCIALNWK_userinfo():
    user_id = session['user_id']
    try:
        db = get_db()
        cursor = db.cursor(dictionary=True)

        cursor.execute('''
                  SELECT access_token, expires_at
                  FROM oauth_connections
                  WHERE user_id = ?
                    AND provider = 'SOCIALNWK'
                  ''', (user_id,))

        connection = cursor.fetchone()
        if not connection:
            return jsonify({"error": "SOCIALNWK account not connected"}), 404

        access_token, expires_at = connection['access_token'], connection['expires_at']
        if expires_at and expires_at < datetime.now().timestamp():
            return jsonify({"error": "SOCIALNWK token expired, please reconnect"}), 401

        headers = {'Authorization': f'Bearer {access_token}'}
        SOCIALNWK_API_URL = 'https://SOCIALNWK.com/api/v10'
        user_response = requests.get(f'{SOCIALNWK_API_URL}/users/@me', headers=headers)

        if user_response.status_code != 200:
            return jsonify({"error": "Failed to fetch SOCIALNWK user info"}), 500

        SOCIALNWK_user = user_response.json()

        return jsonify({
            "SOCIALNWK_user": {
                "id": SOCIALNWK_user.get('id'),
                "username": SOCIALNWK_user.get('username'),
                "avatar": SOCIALNWK_user.get('avatar'),
                "global_name": SOCIALNWK_user.get('global_name')
            }
        }), 200

    except Exception as e:
        print(f"SOCIALNWK userinfo error: {e}")
        return jsonify({"error": "Something went wrong"}), 500

@SOCIALNWK_bp.route('/SOCIALNWK/disconnect', methods=['POST'])
@login_required
@handle_db_locks(max_retries=5)
def SOCIALNWK_disconnect():
    user_id = session['user_id']
    try:
        db = get_db()
        cursor = db.cursor(dictionary=True)

        cursor.execute('''
                  DELETE
                  FROM oauth_connections
                  WHERE user_id = ?
                    AND provider = 'SOCIALNWK'
                  ''', (user_id,))

        cursor.execute('''
                  UPDATE users 
                  SET social_id = 0 
                  WHERE id = ?
                  ''', (user_id,))

        deleted_count = cursor.rowcount
        db.commit()

        if deleted_count > 0:
            return jsonify({"message": "SOCIALNWK account disconnected successfully"}), 200
        else:
            return jsonify({"error": "No SOCIALNWK connection found"}), 404

    except Exception as e:
        print(f"SOCIALNWK disconnect error: {e}")
        return jsonify({"error": "Failed to disconnect SOCIALNWK account"}), 500

def get_SOCIALNWK_user_roles(user_id, guild_id):
    try:
        db = get_db()
        cursor = db.cursor(dictionary=True)

        cursor.execute('''
                  SELECT access_token, expires_at
                  FROM oauth_connections
                  WHERE user_id = ?
                    AND provider = 'SOCIALNWK'
                  ''', (user_id,))

        connection = cursor.fetchone()

        if not connection:
            print(f"No SOCIALNWK connection found for user {user_id}")
            return None

        access_token, expires_at = connection['access_token'], connection['expires_at']
        if expires_at and expires_at < datetime.now().timestamp():
            print(f"SOCIALNWK token expired for user {user_id}")
            return None

        headers = {'Authorization': f'Bearer {access_token}'}
        SOCIALNWK_API_URL = 'https://SOCIALNWK.com/api/v10'

        member_response = requests.get(
            f'{SOCIALNWK_API_URL}/users/@me/guilds/{guild_id}/member',
            headers=headers
        )

        if member_response.status_code == 200:
            member_data = member_response.json()
            user_role_ids = member_data.get('roles', [])

            guild_roles_response = requests.get(
                f'{SOCIALNWK_API_URL}/guilds/{guild_id}/roles',
                headers=headers
            )

            if guild_roles_response.status_code == 200:
                all_roles = guild_roles_response.json()
                user_roles = []
                for role_id in user_role_ids:
                    role_detail = next((role for role in all_roles if role['id'] == role_id), None)
                    if role_detail:
                        user_roles.append({
                            'id': role_detail['id'],
                            'name': role_detail['name'],
                            'color': role_detail.get('color', 0),
                            'position': role_detail.get('position', 0),
                            'permissions': role_detail.get('permissions', '0')
                        })

                user_roles.sort(key=lambda x: x['position'], reverse=True)

                result = {
                    'guild_id': guild_id,
                    'user_id': user_id,
                    'roles': user_roles,
                    'highest_role': user_roles[0] if user_roles else None,
                    'role_ids': user_role_ids
                }

                return result
            else:
                print(f"Failed to fetch guild roles: {guild_roles_response.status_code}")
                return None
        else:
            print(f"User {user_id} not in guild {guild_id} or no access")
            return None

    except Exception as e:
        print(f"Error getting SOCIALNWK roles: {e}")
        return None

@SOCIALNWK_bp.route('/api/internal/SOCIALNWK_roles/<guild_id>', methods=['GET'])
@login_required
@handle_db_locks(max_retries=5)
def internal_SOCIALNWK_roles(guild_id):
    user_id = session['user_id']
    roles_data = get_SOCIALNWK_user_roles(user_id, guild_id)

    if roles_data:
        return jsonify({
            "success": True,
            "data": roles_data
        }), 200
    else:
        return jsonify({
            "success": False,
            "error": "Could not fetch SOCIALNWK roles"
        }), 400
        