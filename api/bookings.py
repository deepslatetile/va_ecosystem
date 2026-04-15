from flask import Blueprint, request, jsonify, session
from database import get_db
from services.utils import login_required, generate_booking_id
from datetime import datetime
from services.db_utils import handle_db_locks

bookings_bp = Blueprint('bookings', __name__)

@bookings_bp.route('/get/booking/<id>', methods=['GET'])
@login_required
@handle_db_locks(max_retries=5)
def get_booking(id):
    try:
        user_id = session['user_id']
        db = get_db()
        cursor = db.cursor(dictionary=True)

        cursor.execute("SELECT * FROM bookings WHERE id = ? AND user_id = ?", (id, user_id))
        booking = cursor.fetchone()

        if not booking:
            return jsonify({"error": "Booking not found"}), 404

        booking_info = {
            "id": str(booking['id']),
            "flight_number": str(booking['flight_number']),
            "created_at": int(booking['created_at']),
            "user_id": str(booking['user_id']),
            "seat": str(booking['seat']),
            "serve_class": str(booking['serve_class']),
            "pax_service": str(booking['pax_service']) if booking['pax_service'] is not None else "",
            "boarding_pass": str(booking['boarding_pass']),
            "note": str(booking['note']) if booking['note'] is not None else "",
            "valid": int(booking['valid'])
        }

        return jsonify(booking_info), 200

    except Exception as e:
        print(e)
        return jsonify({"error": "Something went wrong"}), 500



@bookings_bp.route('/get/bookings_data/<flight_number>', methods=['GET'])
@handle_db_locks(max_retries=5)
def get_bookings_by_flight_safe(flight_number):
    try:
        db = get_db()
        cursor = db.cursor(dictionary=True)

        cursor.execute(
            "SELECT * FROM bookings WHERE flight_number = ? ORDER BY id",
            (flight_number,)
        )
        bookings = cursor.fetchall()

        if not bookings:
            return jsonify([]), 200

        response = []
        for booking in bookings:
            response.append({
                "flight_number": str(booking['flight_number']),
                "seat": str(booking['seat']),
                "serve_class": str(booking['serve_class'])
            })

        return jsonify(response), 200
    
    except Exception as e:
        print(e)
        return jsonify({"error": "Something went wrong"}), 500


@bookings_bp.route('/get/bookings/<flight_number>', methods=['GET'])
@handle_db_locks(max_retries=5)
def get_bookings_by_flight(flight_number):
    try:
        db = get_db()
        cursor = db.cursor(dictionary=True)

        cursor.execute(
            "SELECT * FROM bookings WHERE flight_number = ? ORDER BY id",
            (flight_number,)
        )
        bookings = cursor.fetchall()

        if not bookings:
            return jsonify([]), 200

        response = []
        for booking in bookings:
            response.append({
                "id": str(booking['id']),
                "flight_number": str(booking['flight_number']),
                "created_at": int(booking['created_at']),
                "user_id": str(booking['user_id']),
                "seat": str(booking['seat']),
                "serve_class": str(booking['serve_class']),
                "pax_service": str(booking['pax_service']) if booking['pax_service'] is not None else "",
                "boarding_pass": str(booking['boarding_pass']),
                "note": str(booking['note']) if booking['note'] is not None else "",
                "valid": int(booking['valid'])
            })

        return jsonify(response), 200

    except Exception as e:
        print(e)
        return jsonify({"error": "Something went wrong"}), 500

@bookings_bp.route('/post/booking/', methods=['POST'])
@handle_db_locks(max_retries=5)
def create_booking():
    try:
        data = request.get_json()

        flight_number = data.get('flight_number')
        seat = data.get('seat')
        serve_class = data.get('serve_class')
        user_id = data.get('user_id', '-1')
        passenger_name = data.get('passenger_name')

        if not all([flight_number, seat, serve_class, passenger_name]):
            return jsonify({'error': 'Missing required fields'}), 400

        booking_id = generate_booking_id()
        created_at = int(datetime.now().timestamp())
        note = data.get('note', '')
        passenger_name = data['passenger_name']
        valid = 1
        pax_service = data.get('pax_service', '')
        boarding_pass = data.get('boarding_pass', 'default')
        social_id = data.get('social_id', '')
        virtual_id = data.get('virtual_id', '')

        db = get_db()
        cursor = db.cursor(dictionary=True)

        cursor.execute(
            'SELECT id FROM bookings WHERE flight_number = ? AND seat = ? AND valid = ?',
            (flight_number, seat, valid)
        )
        existing_booking = cursor.fetchone()

        if existing_booking:
            return jsonify({'error': 'Seat already taken'}), 400

        cursor.execute('''
                   INSERT INTO bookings
                   (id, flight_number, created_at, user_id, seat, serve_class,
                    pax_service, boarding_pass, note, valid, passenger_name)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                   ''', (booking_id, flight_number, created_at, user_id, seat, serve_class,
                         pax_service, boarding_pass, note, valid, passenger_name))

        db.commit()

        return jsonify({
            'booking_id': booking_id,
            'message': 'Booking created successfully'
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bookings_bp.route('/delete/booking/<booking_id>', methods=['DELETE'])
@login_required
@handle_db_locks(max_retries=5)
def delete_booking(booking_id):
    try:
        user_id = session['user_id']
        db = get_db()
        cursor = db.cursor(dictionary=True)

        cursor.execute("SELECT * FROM bookings WHERE id = ? AND user_id = ?", (booking_id, user_id))
        booking = cursor.fetchone()

        if not booking:
            return jsonify({"error": "Booking not found"}), 404

        cursor.execute("DELETE FROM bookings WHERE id = ?", (booking_id,))
        db.commit()

        return jsonify({"message": f"Booking {booking_id} deleted successfully"}), 200

    except Exception as e:
        print(e)
        return jsonify({"error": "Something went wrong"}), 500


@bookings_bp.route('/get/user-bookings', methods=['GET'])
@login_required
@handle_db_locks(max_retries=5)
def get_user_bookings():
    try:
        user_id = session['user_id']
        db = get_db()
        cursor = db.cursor(dictionary=True)

        cursor.execute('''
            SELECT 
                b.*,
                s.departure,
                s.arrival,
                s.datetime as flight_datetime,
                s.status as flight_status,
                s.aircraft,
                s.meal,
                s.pax_service as available_services,
                s.seatmap as seatmap_config,
                s.boarding_pass_default
            FROM bookings b
            LEFT JOIN schedule s ON b.flight_number = s.flight_number
            WHERE b.user_id = ?
            ORDER BY s.datetime DESC, b.created_at DESC
        ''', (user_id,))
        
        bookings = cursor.fetchall()

        if not bookings:
            return jsonify([]), 200

        response = []
        for booking in bookings:
            booking_dict = dict(booking)
            current_time = int(datetime.now().timestamp())
            flight_time = booking_dict.get('flight_datetime', 0)
            can_modify = (
                flight_time > current_time and
                booking_dict.get('flight_status') not in ['Arrived', 'Enroute', 'Boarding', 'Check-In']
            )
            
            response.append({
                "id": str(booking_dict['id']),
                "flight_number": str(booking_dict['flight_number']),
                "flight_departure": booking_dict.get('departure', 'Unknown'),
                "flight_arrival": booking_dict.get('arrival', 'Unknown'),
                "flight_datetime": int(booking_dict.get('flight_datetime', 0)),
                "flight_status": booking_dict.get('flight_status', 'Unknown'),
                "aircraft": booking_dict.get('aircraft', 'Unknown'),
                "meal": booking_dict.get('meal', 'Unknown'),
                "available_services": booking_dict.get('available_services', ''),
                "created_at": int(booking_dict['created_at']),
                "seat": str(booking_dict['seat']),
                "serve_class": str(booking_dict['serve_class']),
                "pax_service": str(booking_dict['pax_service']) if booking_dict['pax_service'] else "",
                "note": str(booking_dict['note']) if booking_dict['note'] else "",
                "valid": int(booking_dict['valid']),
                "passenger_name": str(booking_dict['passenger_name']) if booking_dict['passenger_name'] else "",
                "can_modify": can_modify
            })

        return jsonify(response), 200

    except Exception as e:
        print(f"Error fetching user bookings: {e}")
        return jsonify({"error": "Something went wrong"}), 500


@bookings_bp.route('/update/booking/<booking_id>', methods=['PUT'])
@login_required
@handle_db_locks(max_retries=5)
def update_booking(booking_id):
    try:
        user_id = session['user_id']
        data = request.get_json()
        
        db = get_db()
        cursor = db.cursor(dictionary=True)

        cursor.execute(
            "SELECT * FROM bookings WHERE id = ? AND user_id = ?",
            (booking_id, user_id)
        )
        booking = cursor.fetchone()
        
        if not booking:
            return jsonify({"error": "Booking not found or access denied"}), 404

        cursor.execute(
            "SELECT user_group FROM users WHERE id = ?",
            (user_id,)
        )
        user = cursor.fetchone()
        is_admin = user and user['user_group'] in ['HQ', 'STF']

        if not is_admin:
            cursor.execute(
                "SELECT datetime, status FROM schedule WHERE flight_number = ?",
                (booking['flight_number'],)
            )
            flight = cursor.fetchone()
            
            if flight:
                flight_dict = dict(flight)
                current_time = int(datetime.now().timestamp())
                flight_time = flight_dict.get('datetime', 0)
                flight_status = flight_dict.get('status', '')

                if (flight_status in ['Departed', 'Arrived'] or 
                    flight_time < current_time):
                    return jsonify({"error": "Cannot update booking for departed or past flight"}), 400

        update_fields = []
        update_values = []
        
        if 'passenger_name' in data:
            if not data['passenger_name'] or data['passenger_name'].strip() == '':
                return jsonify({"error": "Passenger name cannot be empty"}), 400
            update_fields.append("passenger_name = ?")
            update_values.append(data['passenger_name'].strip())

        if 'note' in data:
            update_fields.append("note = ?")
            update_values.append(data['note'])

        if 'pax_service' in data:
            update_fields.append("pax_service = ?")
            update_values.append(data['pax_service'])

        if 'seat' in data and data['seat'] != booking['seat']:
            new_seat = data['seat']

            cursor.execute('''
                SELECT id FROM bookings 
                WHERE flight_number = ? 
                  AND seat = ? 
                  AND valid = 1 
                  AND id != ?
            ''', (booking['flight_number'], new_seat, booking_id))
            
            if cursor.fetchone():
                return jsonify({"error": "Seat already taken"}), 400
            
            update_fields.append("seat = ?")
            update_values.append(new_seat)

            if 'serve_class' in data:
                update_fields.append("serve_class = ?")
                update_values.append(data['serve_class'])
        
        if not update_fields:
            return jsonify({"error": "No fields to update"}), 400

        update_values.append(booking_id)

        query = f"UPDATE bookings SET {', '.join(update_fields)} WHERE id = ?"
        cursor.execute(query, tuple(update_values))
        db.commit()
        
        return jsonify({
            "message": "Booking updated successfully",
            "booking_id": booking_id
        }), 200
        
    except Exception as e:
        print(f"Error updating booking: {e}")
        return jsonify({"error": "Something went wrong"}), 500