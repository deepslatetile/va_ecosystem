from flask import Blueprint, request, jsonify, session
from database import get_db
from services.utils import login_required
import hashlib

admin_users_bp = Blueprint('admin_users', __name__)

@admin_users_bp.route('/users', methods=['GET'])
@login_required
def get_all_users():
    db = get_db()
    cursor = db.cursor(dictionary=True)

    cursor.execute(
        'SELECT user_group FROM users WHERE id = ?',
        (session['user_id'],)
    )
    admin_user = cursor.fetchone()

    if not admin_user or admin_user['user_group'] not in ['HQ', 'STF']:
        return jsonify({"error": "Admin access required"}), 403

    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    search = request.args.get('search', '')
    group_filter = request.args.get('group', '')
    status_filter = request.args.get('status', '')

    query = '''
            SELECT id,
                   nickname,
                   created_at,
                   virtual_id,
                   social_id,
                   miles,
                   user_group,
                   subgroup,
                   status,
                   pending
            FROM users
            WHERE 1 = 1
            '''
    params = []

    if search:
        query += ' AND (nickname LIKE ? OR virtual_id LIKE ?)'
        params.extend([f'%{search}%', f'%{search}%'])

    if group_filter:
        query += ' AND user_group = ?'
        params.append(group_filter)

    if status_filter:
        query += ' AND status = ?'
        params.append(status_filter)

    count_query = f'SELECT COUNT(*) as total FROM ({query}) AS count_query'
    cursor.execute(count_query, params)
    total = cursor.fetchone()['total']

    query += ' ORDER BY id DESC LIMIT ? OFFSET ?'
    params.extend([per_page, (page - 1) * per_page])

    cursor.execute(query, params)
    users = cursor.fetchall()

    return jsonify({
        'users': [dict(user) for user in users],
        'total': total,
        'page': page,
        'per_page': per_page,
        'total_pages': (total + per_page - 1) // per_page
    })

@admin_users_bp.route('/users/<int:user_id>', methods=['GET'])
@login_required
def get_user_details(user_id):
    db = get_db()
    cursor = db.cursor(dictionary=True)

    cursor.execute(
        'SELECT user_group FROM users WHERE id = ?',
        (session['user_id'],)
    )
    admin_user = cursor.fetchone()

    if not admin_user or admin_user['user_group'] not in ['HQ', 'STF']:
        return jsonify({"error": "Admin access required"}), 403

    cursor.execute(
        'SELECT * FROM users WHERE id = ?',
        (user_id,)
    )
    user = cursor.fetchone()

    if not user:
        return jsonify({"error": "User not found"}), 404

    return jsonify(dict(user))

@admin_users_bp.route('/users/<int:user_id>', methods=['PUT'])
@login_required
def update_user(user_id):
    db = get_db()
    cursor = db.cursor(dictionary=True)

    cursor.execute(
        'SELECT user_group FROM users WHERE id = ?',
        (session['user_id'],)
    )
    admin_user = cursor.fetchone()

    if not admin_user or admin_user['user_group'] not in ['HQ', 'STF']:
        return jsonify({"error": "Admin access required"}), 403

    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    cursor.execute(
        'SELECT * FROM users WHERE id = ?',
        (user_id,)
    )
    current_user = cursor.fetchone()

    if not current_user:
        return jsonify({"error": "User not found"}), 404

    update_fields = []
    update_values = []

    allowed_fields = [
        'nickname', 'virtual_id', 'social_id', 'miles', 'bonuses',
        'user_group', 'subgroup', 'link', 'metadata', 'pending', 'status'
    ]

    for field in allowed_fields:
        if field in data:
            update_fields.append(f"{field} = ?")
            update_values.append(data[field])

    if not update_fields:
        return jsonify({"error": "No valid fields to update"}), 400

    update_values.append(user_id)

    try:
        cursor.execute(
            f"UPDATE users SET {', '.join(update_fields)} WHERE id = ?",
            update_values
        )
        db.commit()

        return jsonify({"message": "User updated successfully"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@admin_users_bp.route('/users/<int:user_id>/reset-password', methods=['POST'])
@login_required
def admin_reset_user_password(user_id):
    db = get_db()
    cursor = db.cursor(dictionary=True)

    # Проверяем права администратора
    cursor.execute(
        'SELECT user_group FROM users WHERE id = ?',
        (session['user_id'],)
    )
    admin_user = cursor.fetchone()

    if not admin_user or admin_user['user_group'] not in ['HQ', 'STF']:
        return jsonify({"error": "Admin access required"}), 403

    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    new_password = data.get('new_password')
    if not new_password:
        return jsonify({"error": "New password is required"}), 400

    if len(new_password) < 6:
        return jsonify({"error": "New password must be at least 6 characters"}), 400

    # Проверяем существование пользователя
    cursor.execute('SELECT id FROM users WHERE id = ?', (user_id,))
    target_user = cursor.fetchone()
    
    if not target_user:
        return jsonify({"error": "User not found"}), 404

    # Устанавливаем новый пароль
    new_password_hash = hashlib.sha256(new_password.encode()).hexdigest()
    try:
        cursor.execute("UPDATE users SET password_hash = ? WHERE id = ?", (new_password_hash, user_id))
        db.commit()

        return jsonify({
            "message": f"Password for user ID {user_id} has been successfully reset."
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@admin_users_bp.route('/users/<int:user_id>', methods=['DELETE'])
@login_required
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

    if user_id == session['user_id']:
        return jsonify({"error": "Cannot delete your own account"}), 400

    cursor.execute(
        'SELECT * FROM users WHERE id = ?',
        (user_id,)
    )
    user = cursor.fetchone()

    if not user:
        return jsonify({"error": "User not found"}), 404

    try:
        cursor.execute('DELETE FROM bookings WHERE user_id = ?', (user_id,))
        cursor.execute('DELETE FROM transactions WHERE user_id = ?', (user_id,))
        cursor.execute('DELETE FROM users WHERE id = ?', (user_id,))

        db.commit()
        return jsonify({"message": "User deleted successfully"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@admin_users_bp.route('/users/stats', methods=['GET'])
@login_required
def get_user_stats():
    db = get_db()
    cursor = db.cursor(dictionary=True)

    cursor.execute(
        'SELECT user_group FROM users WHERE id = ?',
        (session['user_id'],)
    )
    admin_user = cursor.fetchone()

    if not admin_user or admin_user['user_group'] not in ['HQ', 'STF']:
        return jsonify({"error": "Admin access required"}), 403

    cursor.execute('''
                   SELECT COUNT(*)                                        as total_users,
                          COUNT(CASE WHEN status = 'active' THEN 1 END)   as active_users,
                          COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive_users,
                          COUNT(CASE WHEN user_group = 'HQ' THEN 1 END)   as hq_users,
                          COUNT(CASE WHEN user_group = 'STF' THEN 1 END)  as staff_users,
                          COUNT(CASE WHEN user_group = 'PAX' THEN 1 END)  as passenger_users,
                          SUM(miles)                                      as total_miles
                   FROM users
                   ''')
    stats = cursor.fetchone()

    return jsonify(dict(stats))