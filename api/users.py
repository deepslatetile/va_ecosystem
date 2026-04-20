from datetime import datetime
from flask import Blueprint, request, jsonify, session
from database import get_db
from services.utils import login_required
import hashlib
from services.db_utils import handle_db_locks

users_bp = Blueprint('users', __name__)

@users_bp.route('/get/user/<int:user_id>', methods=['GET'])
@login_required
@handle_db_locks(max_retries=5)
def get_user(user_id):
    try:
        db = get_db()
        cursor = db.cursor(dictionary=True)

        cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        user = cursor.fetchone()

        if not user:
            return jsonify({"error": "User not found"}), 404

        user_info = {
            "id": user['id'],
            "nickname": user['nickname'],
            "created_at": user['created_at'],
            "virtual_id": user['virtual_id'],
            "social_id": user['social_id'],
            "miles": user['miles'],
            "bonuses": user['bonuses'] if user['bonuses'] is not None else "",
            "user_group": user['user_group'],
            "subgroup": user['subgroup'],
            "link": user['link'] if user['link'] is not None else "",
            "pfp": user['pfp'] if user['pfp'] is not None else "",
            "metadata": user['metadata'] if user['metadata'] is not None else "",
            "pending": user['pending'] if user['pending'] is not None else "",
            "status": user['status'] if user['status'] is not None else ""
        }

        return jsonify(user_info), 200

    except Exception as e:
        print(e)
        return jsonify({"error": "Something went wrong"}), 500

@users_bp.route('/put/user/<int:user_id>', methods=['PUT'])
@login_required
@handle_db_locks(max_retries=5)
def put_user(user_id):
    from datetime import datetime

    db = get_db()
    cursor = db.cursor(dictionary=True)

    cursor.execute(
        'SELECT user_group FROM users WHERE id = ?',
        (session['user_id'],)
    )
    admin_user = cursor.fetchone()
    data = request.get_json()

    if data.get('manual', False):
        try:
            user_id = session['user_id']
            cursor.execute(
                "SELECT * FROM users WHERE id = ?",
                (user_id,)
            )
            user = cursor.fetchone()

            if not user:
                return jsonify({"error": "User not found"}), 404

            update_fields = []
            update_values = []

            updatable_fields = ['virtual_id', 'social_id']

            for field in updatable_fields:
                if field in data:
                    update_fields.append(f"{field} = ?")
                    update_values.append(data[field])

            if not update_fields:
                return jsonify({"error": "No fields to update"}), 400

            update_values.append(user_id)

            update_query = f"UPDATE users SET {', '.join(update_fields)} WHERE id = ?"
            cursor.execute(update_query, update_values)

            # Обновляем или создаем запись в oauth_connections для SOCIALNWK
            if 'social_id' in data and data['social_id']:
                # Проверяем существующую запись
                cursor.execute('''
                    SELECT id FROM oauth_connections 
                    WHERE user_id = ? AND provider = 'SOCIALNWK'
                ''', (user_id,))

                existing_connection = cursor.fetchone()
                current_timestamp = int(datetime.now().timestamp())

                if existing_connection:
                    # Обновляем существующую запись
                    cursor.execute('''
                        UPDATE oauth_connections
                        SET provider_user_id = ?,
                            created_at = ?
                        WHERE user_id = ? AND provider = 'SOCIALNWK'
                    ''', (
                        data['social_id'],
                        current_timestamp,
                        user_id
                    ))
                else:
                    # Создаем новую запись
                    cursor.execute('''
                        INSERT INTO oauth_connections 
                        (user_id, provider, provider_user_id, access_token, refresh_token,
                         expires_at, created_at)
                        VALUES (?, ?, ?, NULL, NULL, NULL, ?)
                    ''', (
                        user_id,
                        'SOCIALNWK',
                        data['social_id'],
                        current_timestamp
                    ))

            db.commit()
            return jsonify({
                "message": f"User {user_id} updated successfully",
                "updated_fields": update_fields
            }), 200

        except Exception as e:
            print(e)
            db.rollback()
            return jsonify({"error": "Something went wrong"}), 500

    if not data:
        return jsonify({"error": "No JSON data received"}), 400

    if not admin_user or admin_user['user_group'] not in ['HQ', 'STF']:
        return jsonify({"error": "Admin access required"}), 403

    try:
        cursor.execute(
            "SELECT * FROM users WHERE id = ?",
            (user_id,)
        )
        user = cursor.fetchone()

        if not user:
            return jsonify({"error": "User not found"}), 404

        update_fields = []
        update_values = []

        updatable_fields = [
            'nickname', 'virtual_id', 'social_id', 'miles', 'bonuses',
            'user_group', 'subgroup', 'link', 'pfp', 'metadata', 'pending', 'status'
        ]

        for field in updatable_fields:
            if field in data:
                update_fields.append(f"{field} = ?")
                update_values.append(data[field])

        if not update_fields:
            return jsonify({"error": "No fields to update"}), 400

        update_values.append(user_id)

        update_query = f"UPDATE users SET {', '.join(update_fields)} WHERE id = ?"
        cursor.execute(update_query, update_values)

        # Если обновляется social_id и это админ - также обновляем oauth_connections
        if 'social_id' in data and data['social_id']:
            current_timestamp = int(datetime.now().timestamp())

            cursor.execute('''
                SELECT id FROM oauth_connections 
                WHERE user_id = ? AND provider = 'SOCIALNWK'
            ''', (user_id,))

            existing_connection = cursor.fetchone()

            if existing_connection:
                cursor.execute('''
                    UPDATE oauth_connections
                    SET provider_user_id = ?
                    WHERE user_id = ? AND provider = 'SOCIALNWK'
                ''', (
                    data['social_id'],
                    user_id
                ))
            else:
                cursor.execute('''
                    INSERT INTO oauth_connections 
                    (user_id, provider, provider_user_id, access_token, refresh_token,
                     expires_at, created_at)
                    VALUES (?, ?, ?, NULL, NULL, NULL, ?)
                ''', (
                    user_id,
                    'SOCIALNWK',
                    data['social_id'],
                    current_timestamp
                ))

        db.commit()
        return jsonify({"message": f"User {user_id} updated successfully"}), 200

    except Exception as e:
        print(e)
        db.rollback()
        return jsonify({"error": "Something went wrong"}), 500

@users_bp.route('/delete/user/<int:user_id>', methods=['DELETE'])
@login_required
@handle_db_locks(max_retries=5)
def delete_user(user_id):
    db = get_db()
    cursor = db.cursor(dictionary=True)

    cursor.execute(
        'SELECT user_group FROM users WHERE id = ?',
        (session['user_id'],)
    )
    admin_user = cursor.fetchone()

    if not admin_user or admin_user['user_group'] not in ['HQ', 'STF']:
        return jsonify({"error": "Admin access required"}), 403

    try:
        cursor.execute(
            "SELECT * FROM users WHERE id = ?",
            (user_id,)
        )
        user = cursor.fetchone()

        if not user:
            return jsonify({"error": "User not found"}), 404

        cursor.execute("DELETE FROM users WHERE id = ?", (user_id,))
        db.commit()

        return jsonify({"message": f"User {user_id} deleted successfully"}), 200

    except Exception as e:
        print(e)
        return jsonify({"error": "Something went wrong"}), 500

@users_bp.route('/post/user', methods=['POST'])
@handle_db_locks(max_retries=5)
def post_user():
    data = request.get_json()
    if not data:
        return jsonify({"error": "No JSON data received"}), 400

    try:
        required_fields = [
            'nickname',
            'password',
            'user_group',
            'subgroup'
        ]

        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Missing required field: {field}"}), 400

        password_hash = hashlib.sha256(data['password'].encode()).hexdigest()

        miles = 0
        bonuses = ''
        link = data.get('link', '')
        pfp = data.get('pfp', '')
        metadata = ''
        pending = ''
        status = data.get('status', 'active')
        created_at = int(datetime.now().timestamp())

        db = get_db()
        cursor = db.cursor(dictionary=True)

        cursor.execute("SELECT * FROM users WHERE nickname = ?", (data['nickname'],))
        existing_user = cursor.fetchone()

        if existing_user:
            return jsonify({"error": "Username already exists"}), 409

        cursor.execute('''
                  INSERT INTO users (nickname, created_at, virtual_id, social_id, miles, bonuses,
                                     user_group, subgroup, link, pfp, metadata, pending, status, password_hash)
                  VALUES (?, ?, NULL, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                  ''', (
                      data['nickname'],
                      created_at,
                      miles,
                      bonuses,
                      data['user_group'],
                      data['subgroup'],
                      link,
                      pfp,
                      metadata,
                      pending,
                      status,
                      password_hash
                  ))

        user_id = cursor.lastrowid
        db.commit()

        return jsonify({
            "message": "User created successfully",
            "user_id": user_id
        }), 201

    except Exception as e:
        print(e)
        return jsonify({"error": "Something went wrong"}), 500

@users_bp.route('/get/users/virtual/<virtual_id>', methods=['GET'])
@handle_db_locks(max_retries=5)
def get_user_by_virtual_id(virtual_id):
    try:
        db = get_db()
        cursor = db.cursor(dictionary=True)

        cursor.execute(
            'SELECT id, nickname, virtual_id, user_group, miles FROM users WHERE virtual_id = ?',
            (virtual_id,)
        )
        user = cursor.fetchone()

        if user:
            return jsonify({
                'id': user['id'],
                'nickname': user['nickname'],
                'virtual_id': user['virtual_id'],
                'user_group': user['user_group'],
                'miles': user['miles']
            })
        else:
            return jsonify({'error': 'User not found'}), 404

    except Exception as e:
        return jsonify({'error': str(e)}), 500
        