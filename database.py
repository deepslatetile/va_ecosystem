import os
import sqlite3
import time
from flask import g


class SQLiteDB:
    """
    Small wrapper around sqlite3.Connection to preserve the existing call-sites:
      - db.cursor(dictionary=True)
      - cursor.lastrowid
      - db.commit(), db.close()
    """

    def __init__(self, conn: sqlite3.Connection):
        self._conn = conn

    def cursor(self, dictionary: bool = False):
        # We always use sqlite3.Row row_factory, so rows can be accessed like dicts.
        return self._conn.cursor()

    def commit(self):
        return self._conn.commit()

    def close(self):
        return self._conn.close()

    def execute(self, *args, **kwargs):
        return self._conn.execute(*args, **kwargs)

    def __getattr__(self, name):
        # Fallback to underlying sqlite3.Connection attributes (e.g. row_factory).
        return getattr(self._conn, name)

def get_db():
    if 'db' not in g:
        db_path = os.getenv("SQLITE_PATH") or os.getenv("DATABASE_URL") or "app.db"
        # Allow DATABASE_URL like sqlite:///path/to.db
        if isinstance(db_path, str) and db_path.startswith("sqlite:///"):
            db_path = db_path[len("sqlite:///") :]
        if isinstance(db_path, str) and db_path.startswith("sqlite://"):
            db_path = db_path[len("sqlite://") :]

        try:
            conn = sqlite3.connect(db_path, check_same_thread=False)
            conn.row_factory = sqlite3.Row
            conn.execute("PRAGMA foreign_keys = ON")
            conn.execute("PRAGMA journal_mode = WAL")
            conn.execute("PRAGMA busy_timeout = 5000")
            g.db = SQLiteDB(conn)
        except sqlite3.Error as e:
            print(f"Database connection error: {e}")
            raise
    return g.db

def close_db(e=None):
    db = g.pop('db', None)
    if db is not None:
        try:
            db.close()
        except:
            pass

def execute_with_retry(query, params=(), max_retries=3):
    for attempt in range(max_retries):
        try:
            db = get_db()
            cursor = db.cursor(dictionary=True)
            cursor.execute(query, params)
            return cursor
        except sqlite3.OperationalError as e:
            # SQLite uses "database is locked" / "database is busy" for contention.
            msg = str(e).lower()
            if attempt < max_retries - 1:
                if "locked" in msg or "busy" in msg:
                    time.sleep(0.5 * (attempt + 1))
                    continue
            raise
        except sqlite3.Error:
            raise

def init_db():
    try:
        db_path = os.getenv("SQLITE_PATH") or os.getenv("DATABASE_URL") or "app.db"
        if isinstance(db_path, str) and db_path.startswith("sqlite:///"):
            db_path = db_path[len("sqlite:///") :]
        if isinstance(db_path, str) and db_path.startswith("sqlite://"):
            db_path = db_path[len("sqlite://") :]

        conn = sqlite3.connect(db_path, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        conn.execute("PRAGMA journal_mode = WAL")
        conn.execute("PRAGMA busy_timeout = 5000")
        cursor = conn.cursor()

        print("🔄 Creating tables...")

        # Schedule table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS schedule
            (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                flight_number TEXT NOT NULL,
                created_at BIGINT NOT NULL,
                departure TEXT NOT NULL,
                arrival TEXT NOT NULL,
                datetime BIGINT NOT NULL,
                arrival_time BIGINT NOT NULL,
                status TEXT NOT NULL,
                seatmap TEXT NOT NULL,
                aircraft TEXT NOT NULL,
                meal TEXT NOT NULL,
                pax_service TEXT NOT NULL,
                boarding_pass_default TEXT NOT NULL,
                ptfs_departure TEXT,
                ptfs_arrival TEXT,
                route_type TEXT DEFAULT 'ptfs'
            )
        ''')
        print("✅ Schedule table created")

        # PAX Service table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS pax_service
            (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT,
                image BLOB,
                groupname TEXT NOT NULL,
                subgroupname TEXT NOT NULL,
                price REAL DEFAULT 0
            )
        ''')
        print("✅ PAX Service table created")

        # Bookings table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS bookings
            (
                id TEXT PRIMARY KEY,
                flight_number TEXT NOT NULL,
                created_at BIGINT NOT NULL,
                user_id INT NOT NULL,
                seat TEXT NOT NULL,
                serve_class TEXT NOT NULL,
                pax_service TEXT,
                boarding_pass TEXT,
                note TEXT,
                valid INT,
                passenger_name TEXT
            )
        ''')
        print("✅ Bookings table created")

        # Users table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users
            (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nickname TEXT NOT NULL,
                created_at BIGINT NOT NULL,
                virtual_id TEXT,
                social_id TEXT,
                miles INT NOT NULL,
                bonuses TEXT,
                user_group TEXT NOT NULL,
                subgroup TEXT NOT NULL,
                link TEXT,
                pfp BLOB,
                metadata TEXT,
                pending TEXT,
                status TEXT,
                password_hash TEXT NOT NULL,
                session_token TEXT
            )
        ''')
        print("✅ Users table created")

        # Meals table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS meals
            (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                serve_class TEXT NOT NULL,
                serve_time TEXT NOT NULL,
                name TEXT NOT NULL,
                description TEXT,
                image TEXT
            )
        ''')
        print("✅ Meals table created")

        # About us table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS about_us
            (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT NOT NULL,
                image TEXT,
                about_group TEXT NOT NULL,
                subgroup TEXT NOT NULL,
                link TEXT,
                role TEXT,
                position TEXT,
                years_experience INT,
                fleet_type TEXT,
                registration_number TEXT,
                capacity INT,
                first_flight INT,
                display_order INT DEFAULT 0,
                is_active INTEGER DEFAULT 1
            )
        ''')
        print("✅ About us table created")

        # Configs table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS configs
            (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT NOT NULL,
                image TEXT
            )
        ''')
        print("✅ Configs table created")

        # Web configs table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS web_configs
            (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                page_name TEXT NOT NULL UNIQUE,
                page_display TEXT NOT NULL,
                state INT DEFAULT 1,
                content TEXT,
                last_updated BIGINT
            )
        ''')
        print("✅ Web configs table created")

        # OAuth connections table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS oauth_connections
            (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                provider TEXT,
                provider_user_id TEXT,
                access_token TEXT,
                refresh_token TEXT,
                expires_at BIGINT,
                created_at BIGINT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
                UNIQUE (user_id, provider)
            )
        ''')
        print("✅ OAuth connections table created")

        # Transactions table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS transactions
            (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INT NOT NULL,
                booking_id TEXT,
                amount REAL NOT NULL,
                description TEXT NOT NULL,
                type TEXT NOT NULL,
                admin_user_id INT NOT NULL,
                created_at BIGINT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
                FOREIGN KEY (admin_user_id) REFERENCES users (id) ON DELETE CASCADE
            )
        ''')
        print("✅ Transactions table created")

        # Flight Configs table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS flight_configs
            (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                type TEXT NOT NULL,
                data TEXT NOT NULL,
                description TEXT,
                created_at BIGINT NOT NULL,
                updated_at BIGINT NOT NULL,
                is_active INT DEFAULT 1
            )
        ''')
        print("✅ Flight Configs table created")

        # Weather Cache table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS weather_cache
            (
                icao_code TEXT PRIMARY KEY,
                data TEXT NOT NULL,
                created_at BIGINT NOT NULL,
                expires_at BIGINT NOT NULL
            )
        ''')
        print("✅ Weather Cache table created")

        try:
            cursor.execute('''
                CREATE INDEX idx_weather_cache_expires 
                ON weather_cache(expires_at)
            ''')
            print("✅ Weather cache index created")
        except sqlite3.Error as e:
            # SQLite: index creation can fail if it already exists.
            if "already exists" not in str(e).lower():
                print(f"⚠️ Could not create index (might already exist): {e}")

        print("🎉 All SQLite tables created successfully")
        conn.commit()
        conn.close()

    except sqlite3.Error as e:
        print(f"❌ Database initialization failed: {e}")
        raise
        
