from flask import Blueprint, request, jsonify, session, current_app
from database import get_db
from datetime import datetime
import requests
import json
from services.utils import login_required
from services.db_utils import handle_db_locks

schedule_bp = Blueprint('schedule', __name__)


def send_to_24departures(data, flight_number, method='create'):
    """
    Отправляет данные в 24Departures API

    Структура данных для 24Departures:
    - CREATE: все поля из таблицы flights + api_key
    - UPDATE: {'field': [поле1, поле2], 'new': [значение1, значение2], 'api_key': ...}
    - DELETE: {'flight_number': ..., 'api_key': ...}
    """
    try:
        api_key = current_app.config.get('DEPARTURE_API_KEY')
        api_url = current_app.config.get('DEPARTURE_API_URL')

        if not api_key or not api_url:
            print("⚠️ 24Departures API configuration missing")
            return None

        headers = {
            'Content-Type': 'application/json',
        }

        print(f"📤 Sending to 24Departures API: {api_url}, method: {method}")

        if method == 'create':
            url = f'{api_url}/create_flight'
            # 24Departures ожидает структуру как в таблице flights
            # Приводим timestamp к строке, так как 24Departures хранит departure_time как VARCHAR
            payload = {
                'api_key': api_key,
                'flight_number': flight_number,
                'departure': data.get('departure', ''),
                'arrival': data.get('arrival', ''),
                'ptfs_departure': data.get('ptfs_departure', data.get('departure', '')),
                'ptfs_arrival': data.get('ptfs_arrival', data.get('arrival', '')),
                'aircraft': data.get('aircraft', ''),
                'status': data.get('status', 'Scheduled'),
                'route_type': data.get('route_type', 'ptfs'),
                'departure_time': str(data.get('datetime', 0)),  # Важно: преобразуем в строку!
                'arrival_time': str(data.get('arrival_time', 0))  # Важно: преобразуем в строку!
            }
            print(f"CREATE payload: {payload}")
            response = requests.post(url, json=payload, headers=headers, timeout=10)

        elif method == 'update':
            url = f'{api_url}/update/{flight_number}'
            # Для update нужна структура с field и new
            # Исключаем api_key из полей для обновления
            fields_to_update = []
            new_values = []

            # Маппинг полей: наши названия -> названия в 24Departures
            field_mapping = {
                'flight_number': 'flight_number',
                'departure': 'departure',
                'arrival': 'arrival',
                'datetime': 'departure_time',
                'arrival_time': 'arrival_time',
                'status': 'status',
                'seatmap': 'aircraft',  # Внимание: у нас seatmap, у них aircraft
                'aircraft': 'aircraft',
                'ptfs_departure': 'ptfs_departure',
                'ptfs_arrival': 'ptfs_arrival',
                'route_type': 'route_type'
            }

            for our_field, their_field in field_mapping.items():
                if our_field in data:
                    fields_to_update.append(their_field)
                    # Преобразуем timestamp в строку для departure_time и arrival_time
                    if our_field in ['datetime', 'arrival_time']:
                        new_values.append(str(data[our_field]))
                    else:
                        new_values.append(str(data[our_field]))

            # Если нечего обновлять, просто возвращаемся
            if not fields_to_update:
                print("⚠️ No fields to update for 24Departures")
                return None

            payload = {
                'field': fields_to_update,
                'new': new_values,
                'api_key': api_key
            }
            print(f"UPDATE payload: {payload}")
            response = requests.post(url, json=payload, headers=headers, timeout=10)

        elif method == 'delete':
            url = f'{api_url}/delete_flight/{flight_number}'
            payload = {
                'flight_number': flight_number,
                'api_key': api_key
            }
            print(f"DELETE payload: {payload}")
            response = requests.delete(url, json=payload, headers=headers, timeout=10)
        else:
            return None

        print(f"📡 Response from 24departures: {response.status_code}")
        if response.status_code not in [200, 201]:
            print(f"❌ API Error: {response.text}")
        else:
            print(f"✅ Successfully sent to 24departures")

        return response

    except Exception as e:
        print(f"❌ Error sending to 24departures: {e}")
        import traceback
        traceback.print_exc()
        return None


@schedule_bp.route('/get/schedule', methods=['GET'])
@handle_db_locks(max_retries=5)
def get_schedule():
    try:
        db = get_db()
        cursor = db.cursor()

        cursor.execute('''
                       SELECT s.*,
                              COUNT(b.id) as flying_count
                       FROM schedule s
                                LEFT JOIN bookings b ON s.flight_number = b.flight_number
                       GROUP BY s.id
                       ORDER BY s.datetime ASC
                       ''')
        schedule = cursor.fetchall()

        # Получаем имена колонок
        columns = [desc[0] for desc in cursor.description]
        schedule_list = []

        for row in schedule:
            flight = dict(zip(columns, row))

            # Определяем тип маршрута
            route_type = flight.get('route_type', 'ptfs')

            # Формируем отображение аэропортов
            departure_display = flight.get('departure', 'N/A')
            arrival_display = flight.get('arrival', 'N/A')

            if route_type == 'ptfs':
                # Показываем "Название (PTFS код)" если есть PTFS код
                ptfs_departure = flight.get('ptfs_departure', '')
                ptfs_arrival = flight.get('ptfs_arrival', '')

                if ptfs_departure:
                    departure_display = f"{departure_display} ({ptfs_departure})"
                if ptfs_arrival:
                    arrival_display = f"{arrival_display} ({ptfs_arrival})"

            # Форматируем arrival_time в читаемый формат для фронтенда
            arrival_time_display = ''
            if flight.get('arrival_time'):
                try:
                    arrival_timestamp = int(flight['arrival_time'])
                    arrival_date = datetime.fromtimestamp(arrival_timestamp)
                    arrival_time_display = arrival_date.strftime('%H:%M')
                except:
                    arrival_time_display = str(flight['arrival_time'])

            flight_info = {
                "id": flight['id'],
                "flight_number": flight['flight_number'],
                "created_at": flight['created_at'],
                "departure": flight['departure'],
                "arrival": flight['arrival'],
                "ptfs_departure": flight.get('ptfs_departure', ''),
                "ptfs_arrival": flight.get('ptfs_arrival', ''),
                "route_type": route_type,
                "display_departure": departure_display,
                "display_arrival": arrival_display,
                "datetime": flight['datetime'],
                "arrival_time": flight.get('arrival_time', ''),
                "arrival_time_display": arrival_time_display,
                "status": flight['status'],
                "seatmap": flight['seatmap'],
                "aircraft": flight['aircraft'],
                "meal": flight['meal'],
                "pax_service": flight['pax_service'],
                "boarding_pass_default": flight['boarding_pass_default'],
                "flying_count": flight['flying_count']
            }
            schedule_list.append(flight_info)

        return jsonify(schedule_list), 200

    except Exception as e:
        print(f"❌ Error in get_schedule: {e}")
        return jsonify({"error": "Something went wrong"}), 500


@schedule_bp.route('/get/schedule/<flight_identifier>', methods=['GET'])
@handle_db_locks(max_retries=5)
def get_flight(flight_identifier):
    try:
        db = get_db()
        cursor = db.cursor()

        # Пробуем найти по flight_number или id
        if flight_identifier.isdigit():
            cursor.execute('''
                           SELECT s.*,
                                  COUNT(b.id) as flying_count
                           FROM schedule s
                                    LEFT JOIN bookings b ON s.flight_number = b.flight_number
                           WHERE s.id = ?
                           GROUP BY s.id
                           ''', (int(flight_identifier),))
        else:
            cursor.execute('''
                           SELECT s.*,
                                  COUNT(b.id) as flying_count
                           FROM schedule s
                                    LEFT JOIN bookings b ON s.flight_number = b.flight_number
                           WHERE s.flight_number = ?
                           GROUP BY s.id
                           ''', (flight_identifier,))

        row = cursor.fetchone()

        if not row:
            return jsonify({"error": "Flight not found"}), 404

        # Получаем имена колонок
        columns = [desc[0] for desc in cursor.description]
        flight = dict(zip(columns, row))

        # Определяем тип маршрута
        route_type = flight.get('route_type', 'ptfs')

        # Формируем отображение аэропортов
        departure_display = flight.get('departure', 'N/A')
        arrival_display = flight.get('arrival', 'N/A')

        if route_type == 'ptfs':
            # Показываем "Название (PTFS код)" если есть PTFS код
            ptfs_departure = flight.get('ptfs_departure', '')
            ptfs_arrival = flight.get('ptfs_arrival', '')

            if ptfs_departure:
                departure_display = f"{departure_display} ({ptfs_departure})"
            if ptfs_arrival:
                arrival_display = f"{arrival_display} ({ptfs_arrival})"

        # Форматируем arrival_time в читаемый формат для фронтенда
        arrival_time_display = ''
        if flight.get('arrival_time'):
            try:
                arrival_timestamp = int(flight['arrival_time'])
                arrival_date = datetime.fromtimestamp(arrival_timestamp)
                arrival_time_display = arrival_date.strftime('%H:%M')
            except:
                arrival_time_display = str(flight['arrival_time'])

        flight_info = {
            "id": flight['id'],
            "flight_number": flight['flight_number'],
            "created_at": flight['created_at'],
            "departure": flight['departure'],
            "arrival": flight['arrival'],
            "ptfs_departure": flight.get('ptfs_departure', ''),
            "ptfs_arrival": flight.get('ptfs_arrival', ''),
            "route_type": route_type,
            "display_departure": departure_display,
            "display_arrival": arrival_display,
            "datetime": flight['datetime'],
            "arrival_time": flight.get('arrival_time', ''),
            "arrival_time_display": arrival_time_display,
            "status": flight['status'],
            "seatmap": flight['seatmap'],
            "aircraft": flight['aircraft'],
            "meal": flight['meal'],
            "pax_service": flight['pax_service'],
            "boarding_pass_default": flight['boarding_pass_default'],
            "flying_count": flight['flying_count']
        }

        return jsonify(flight_info), 200

    except Exception as e:
        print(f"❌ Error in get_flight: {e}")
        return jsonify({"error": "Something went wrong"}), 500


@schedule_bp.route('/post/schedule', methods=['POST'])
@login_required
@handle_db_locks(max_retries=5)
def post_schedule():
    try:
        db = get_db()
        cursor = db.cursor()

        cursor.execute(
            'SELECT user_group FROM users WHERE id = ?',
            (session['user_id'],)
        )
        row = cursor.fetchone()

        if row:
            columns = [desc[0] for desc in cursor.description]
            admin_user = dict(zip(columns, row))
        else:
            admin_user = None

        if not admin_user or admin_user['user_group'] not in ['HQ', 'STF']:
            return jsonify({"error": "Admin access required"}), 403

        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data received"}), 400

        required_fields = [
            'flight_number',
            'departure',
            'arrival',
            'datetime',
            'arrival_time',
            'seatmap',
            'aircraft'
        ]

        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Missing required field: {field}"}), 400

        cursor.execute(
            'SELECT id FROM schedule WHERE flight_number = ?',
            (data['flight_number'],)
        )
        existing_flight = cursor.fetchone()

        if existing_flight:
            return jsonify({"error": "Flight with this number already exists"}), 409

        # Определяем тип маршрута
        route_type = data.get('route_type', 'ptfs')

        cursor.execute('''
                       INSERT INTO schedule (flight_number, created_at, departure, arrival, datetime,
                                             arrival_time, status, seatmap, aircraft, meal, pax_service,
                                             boarding_pass_default, ptfs_departure, ptfs_arrival, route_type)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                       ''', (
            str(data['flight_number']),
            int(datetime.now().timestamp()),
            str(data['departure']),
            str(data['arrival']),
            int(data['datetime']),
            int(data['arrival_time']) if data.get('arrival_time') else None,
            str(data.get('status', 'Scheduled')),
            str(data['seatmap']),
            str(data['aircraft']),
            str(data.get('meal', 'Standard Meal Service')),
            str(data.get('pax_service', '[]')),
            str(data.get('boarding_pass_default', 'default')),
            str(data.get('ptfs_departure', data.get('departure', ''))),
            str(data.get('ptfs_arrival', data.get('arrival', ''))),
            str(route_type)
        ))

        db.commit()

        # Подготовка данных для API 24departures
        # Важно: timestamp нужно преобразовать в строку, так как 24Departures хранит как VARCHAR
        api_data = {
            "flight_number": str(data['flight_number']),
            "departure": str(data['departure']),
            "arrival": str(data['arrival']),
            "ptfs_departure": str(data.get('ptfs_departure', data.get('departure', ''))),
            "ptfs_arrival": str(data.get('ptfs_arrival', data.get('arrival', ''))),
            "aircraft": str(data['aircraft']),
            "status": str(data.get('status', 'Scheduled')),
            "route_type": str(route_type),
            "datetime": int(data['datetime']),  # Для нашего schedule.py
            "arrival_time": int(data.get('arrival_time', 0)) if data.get('arrival_time') else 0,
            "seatmap": str(data['seatmap']),  # Не используется в 24Departures
            "meal": str(data.get('meal', 'Standard Meal Service')),  # Не используется в 24Departures
            "pax_service": str(data.get('pax_service', '[]'))  # Не используется в 24Departures
        }

        # Отправляем данные в API 24departures
        send_to_24departures(api_data, data['flight_number'], method='create')

        return jsonify({
            "message": "Flight created successfully",
            "flight_number": data['flight_number']
        }), 201

    except Exception as e:
        print(f"❌ Error in post_schedule: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@schedule_bp.route('/put/schedule/<int:flight_id>', methods=['PUT'])
@login_required
@handle_db_locks(max_retries=5)
def put_schedule(flight_id):
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data received"}), 400

        db = get_db()
        cursor = db.cursor()

        cursor.execute("SELECT * FROM schedule WHERE id = ?", (flight_id,))
        row = cursor.fetchone()

        if not row:
            return jsonify({"error": "Flight not found"}), 404

        columns = [desc[0] for desc in cursor.description]
        flight = dict(zip(columns, row))

        update_fields = []
        update_values = []

        updatable_fields = [
            'flight_number', 'departure', 'arrival', 'datetime', 'arrival_time',
            'status', 'seatmap', 'aircraft', 'meal', 'pax_service', 'boarding_pass_default',
            'ptfs_departure', 'ptfs_arrival', 'route_type'
        ]

        for field in updatable_fields:
            if field in data:
                update_fields.append(f"{field} = ?")
                update_values.append(str(data[field]))

        if not update_fields:
            return jsonify({"error": "No fields to update"}), 400

        if 'flight_number' in data:
            cursor.execute("SELECT * FROM schedule WHERE flight_number = ? AND id != ?",
                           (data['flight_number'], flight_id))
            existing_flight = cursor.fetchone()
            if existing_flight:
                return jsonify({"error": "Flight with this number already exists"}), 409

        update_values.append(flight_id)

        update_query = f"UPDATE schedule SET {', '.join(update_fields)} WHERE id = ?"
        cursor.execute(update_query, update_values)

        db.commit()

        # Подготовка данных для API 24departures
        # Формируем данные для отправки в 24Departures
        api_data = {}

        for field in updatable_fields:
            if field in data:
                api_data[field] = str(data[field])

        # Если обновлялся flight_number, используем новый, иначе старый
        flight_number = data.get('flight_number', flight['flight_number'])

        # Отправляем обновление в API 24departures
        send_to_24departures(api_data, flight_number, method='update')

        return jsonify({"message": f"Flight {flight_id} updated successfully"}), 200

    except Exception as e:
        print(f"❌ Error in put_schedule: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": "Something went wrong"}), 500


@schedule_bp.route('/delete/schedule/<int:flight_id>', methods=['DELETE'])
@login_required
@handle_db_locks(max_retries=5)
def delete_schedule(flight_id):
    try:
        db = get_db()
        cursor = db.cursor()

        cursor.execute("SELECT * FROM schedule WHERE id = ?", (flight_id,))
        row = cursor.fetchone()

        if not row:
            return jsonify({"error": "Flight not found"}), 404

        columns = [desc[0] for desc in cursor.description]
        flight = dict(zip(columns, row))

        cursor.execute("DELETE FROM schedule WHERE id = ?", (flight_id,))
        db.commit()

        # Отправляем запрос на удаление в API 24departures
        send_to_24departures({}, flight['flight_number'], method='delete')

        return jsonify({"message": f"Flight {flight_id} deleted successfully"}), 200

    except Exception as e:
        print(f"❌ Error in delete_schedule: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": "Something went wrong"}), 500