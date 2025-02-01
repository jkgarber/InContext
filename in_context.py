import sys

if len(sys.argv) != 2:
    print('Usage: python3 in_context.py <user_name>')
    exit(1)

user_name = sys.argv[1]


from datetime import datetime

#-- SQLite database -------------------------------------------------------------------------------

import sqlite3
db = 'ic0.db'
def dict_factory(cursor, row):
    fields = [column[0] for column in cursor.description]
    output = {key: value for key, value in zip(fields, row)}
    return output


#-- Flask app -------------------------------------------------------------------------------------

from flask import Flask, render_template, jsonify, request, redirect, session
app = Flask(__name__)


#-- LLM chat function ------------------------------------------------------------------------

import openai
import anthropic
import os
import json
openai_client = openai.OpenAI(api_key=os.environ.get("OPENAI_API_KEY"),)
anthropic_client = anthropic.Anthropic()
openai_llm = 'gpt-4o-mini'
anthropic_llm = 'claude-3-5-haiku-20241022'
def llm_chat(conversation_history, user_content, item_list, context):
    if context == 'Testing':
        memory = f"The user's name is {user_name}. He is developing a ChatGPT wrapper because he wants to work with AI more independently and in his own way. You are communicating with {user_name} via the wrapper. This conversation is part of a testing routine for the app's development. The list of items you are about to receive contains test data, which is managed by {user_name} via the app's UI. Items: {item_list}"
    else:
        memory = f"The user's name is {user_name}, and he has a list of items and each item has a set of details. You are receiving this list of items in preparation for the conversation with {user_name}. {user_name} uses this list of items to organize his thoughts and prioritize his efforts. {user_name} wants you to take the list of items into account when formulating your response. Here's some more information about the items. The items are listed in order of priority. The details of each item are ordered by date added (oldest to newest). Note that details are optional, so it's possible that the list of details for an item will be empty. Note that the content itself is written in Markdown. Now, you should know, {user_name} developed a ChatGPT wrapper because he wants to work with AI more independently and in his own way. The wrapper app is called 'InContext'. You are communicating with {user_name} via inContext. {user_name} manages the items, their details and their priority level via the InContext UI, which also displays this conversation. {user_name} might update the items during the conversation and you're receiving the most up-to-date version of the item list in this system message. So, if {user_name} updates the list during the conversation, you'll see a previous version of the list in the conversation history, which follows this system message. Good luck. Make sure you take into account the most up-to-date version of the item list in your response. {item_list}"
    try:
        system_message = {"role": "system", "content": f"Assume the role of a helpful assistant. Use this information to help the user: {memory}"}
        messages = [system_message] + conversation_history + [{"role":"user", "content": user_content}]
        response = openai_client.chat.completions.create(
            model=openai_llm,
            messages=messages,
        )
        return response.choices[0].message.content
    except Exception as e:
        return f"Error: {str(e)}"

def llm_developer_chat(conversation_history, user_content, item_list, context):
    system = f"Assume the role of a full stack web developer specialising in Python-Flask, SQLite, and vanilla JS, HTML, and CSS. Your purpose is to assist the user with coding tasks."
    intro = [
        {
            "role":"user",
            "content": f"Hi, I'm {user_name}. I'm developing an LLM wrapper app because I want to work with LLMs in a customized way. The content you are about to receive contains the current code files, which I inputted via the app's UI. (You are communicating with me via the wrapper.) File contents: {item_list}"
        }
    ]
    messages = intro + conversation_history + [{"role":"user", "content": user_content}]
    try:
        message = anthropic_client.messages.create(
            model=anthropic_llm,
            system=system,
            messages=messages,
            max_tokens=1024,
        )
        return message.content[0].text
    except Exception as e:
        return f"Error: {str(e)}"

#-- Database setup --------------------------------------------------------------------------------

try:
    con = sqlite3.connect(db)
    cur = con.cursor()
    cur.executescript("""
        BEGIN;
        CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, hash TEXT);
        CREATE TABLE IF NOT EXISTS contexts (name TEXT, description TEXT);
        CREATE TABLE IF NOT EXISTS systems (name TEXT, context TEXT, FOREIGN KEY(context) REFERENCES contexts(name));
        CREATE TABLE IF NOT EXISTS items (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, rank INTEGER, context TEXT, system TEXT, FOREIGN KEY(context) REFERENCES contexts(name), FOREIGN KEY(system) REFERENCES systems(name));
        CREATE TABLE IF NOT EXISTS details (item_id INTEGER, role TEXT, content TEXT, rank INTEGER, FOREIGN KEY(item_id) REFERENCES items(id));
        COMMIT;
    """)
    contexts = [
        (
            'Testing',
            'Testing context.  Note: ChatGPT is not primed to assist you effectively in the context because this is the testing context. Create a new context to utilize ChatGPT more effectively.',
        ),
    ]
    systems = [
        (
            'items',
            'Testing',
        ),
    ]
    res = cur.execute('SELECT * FROM contexts')
    rows = res.fetchall()
    for context in contexts:
        if context not in rows:
            res = cur.execute('INSERT INTO contexts(name, description) VALUES(?, ?)', context)
            con.commit()
    res = cur.execute('SELECT * FROM systems')
    rows = res.fetchall()
    for system in systems:
        if system not in rows:
            res = cur.execute('INSERT INTO systems(name, context) VALUES(?, ?)', system)
            con.commit()
    cur.close()
    con.close()
except Exception as e:
    print(f"Error: {str(e)}")
    exit(2)


#-- Login/Users -----------------------------------------------------------------------------------

from flask_session import Session
from werkzeug.security import check_password_hash, generate_password_hash
from functools import wraps

# Configure session to use filesystem (instead of signed cookies)
app.config["SESSION_PERMANENT"] = False
app.config["SESSION_TYPE"] = "filesystem"
Session(app)


def login_required(f):
    """
    Decorate routes to require login.

    https://flask.palletsprojects.com/en/latest/patterns/viewdecorators/
    """

    @wraps(f)
    def decorated_function(*args, **kwargs):
        if session.get("user_id") is None:
            return redirect("/login")
        return f(*args, **kwargs)
    return decorated_function


@app.after_request
def after_request(response):
    """Ensure responses aren't cached"""
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Expires"] = 0
    response.headers["Pragma"] = "no-cache"
    return response


#-- Layout Routes ------------------------------------------------------------------------------------

@app.route("/login", methods=["GET", "POST"])
def login():
    """Log user in"""

    # Forget any user_id
    session.clear()

    # User reached route via POST (as by submitting a form via POST)
    if request.method == "POST":
        # Ensure username was submitted
        if not request.json['username']:
            return jsonify(dict(message='must provide username')), 403

        # Ensure password was submitted
        elif not request.json['password']:
            return jsonify(dict(message='must provide password')), 403

        # Query database for username
        con = sqlite3.connect(db)
        con.row_factory = dict_factory
        cur = con.cursor()
        res = cur.execute('SELECT * FROM users WHERE name = ?', (request.json['username'],))
        rows = res.fetchall()
        cur.close()
        con.close()

        # Ensure username exists and password is correct
        if len(rows) != 1 or not check_password_hash(
            rows[0]["hash"], request.json['password']
        ):
            return jsonify(dict(message='invalid username and/or password')), 403
        
        # Remember which user has logged in
        session["user_id"] = rows[0]['id']

        # Redirect user to home page
        return jsonify(dict(message="ok")), 200

    # User reached route via GET (as by clicking a link or via redirect)
    else:
        return render_template("login.html")


@app.route("/logout")
def logout():
    """Log user out"""
    session.clear()
    return redirect("/")


@app.route("/register", methods=["GET", "POST"])
def register():
    """Register user"""
    if request.method == "POST":
        if not request.json['username']:
            return jsonify(dict(message='must provide username')), 403
        if not request.json['password']:
            return jsonify(dict(message='must provide password')), 403
        if not request.json['confirmation']:
            return jsonify(dict(message='must provide password')), 400
        password = request.json['password']
        confirmation = request.json['confirmation']

        if password != confirmation:
            return jsonify(dict(message="Password and confirmation don't match")), 400

        # Add the user to the user table
        username = request.json['username']
        try:
            con = sqlite3.connect(db)
            cur = con.cursor()
            cur.execute("INSERT INTO users (name, hash) VALUES(?, ?)", (username, generate_password_hash(password),))
            con.commit()
            cur.close()
            con.close()
        except ValueError:
            return jsonify(dict(message='Username already exists')), 400
        return jsonify(dict(message="ok")), 200

    # User reached route via GET (as by clicking a link or via redirect)
    else:
        return render_template("register.html")


@app.route("/")
@login_required
def root():
    server_response = redirect("/Testing")
    return server_response, 301


@app.route("/<context>")
@login_required
def context(context):
    con = sqlite3.connect(db)
    cur = con.cursor()
    res = cur.execute("SELECT name, description FROM contexts")
    contexts = res.fetchall()
    cur.close()
    con.close()
    if context in [c[0] for c in contexts]:
        description = [c[1] for c in contexts if c[0] == context][0]
        server_response = render_template("context.html", context=context, description=description)
        return server_response, 200
    else:
        return "not a context", 400 


#-- API routes ------------------------------------------------------------------------------------

@app.route("/api/systems")
@login_required
def systems():
    context = request.args.get('context')
    con = sqlite3.connect(db)
    con.row_factory = dict_factory
    cur = con.cursor()
    res = cur.execute("SELECT name FROM systems WHERE context = ?", (context,))
    systems = res.fetchall()
    cur.close()
    con.close()
    api_response = jsonify(systems=systems)
    return api_response


@app.route("/api/items", methods=["GET", "POST"])
@login_required
def api_items():
    if request.method == "GET":
        context = request.args.get('context')
        system = request.args.get('system')
        con = sqlite3.connect(db)
        con.row_factory = dict_factory
        cur = con.cursor()
        res = cur.execute("SELECT id, name, rank FROM items WHERE context = ? AND system = ? AND rank NOT NULL", (context, system,))
        items = res.fetchall()
        for item in items:
            res = cur.execute("SELECT content, rank, role FROM details WHERE item_id = ? AND rank NOT NULL ORDER BY rank", (item['id'],))
            item['details'] = res.fetchall()
        cur.close()
        con.close()
        items.sort(key=lambda x: x['rank'])
        api_response = jsonify(items=items)
        return api_response


@app.route('/api/operations', methods=['POST'])
@login_required
def api_operations():
    with open("operation_log", "a") as outfile:
        log_info = dict()
        log_info['system'] = request.json['system']
        log_info['operation'] = request.json['operation']
        outfile.write(json.dumps(log_info))
        outfile.write("\n")

    operation = conduct_operation(request.json)
    with open("operation_log", "a") as outfile:
        log_info = dict()
        log_info['valid'] = operation['valid']
        log_info['successful'] = operation['successful']
        outfile.write(json.dumps(log_info))
        outfile.write("\n")
    if operation['valid']:
        if operation['successful']:
            return jsonify(operation), 200
        else:
            return operation['advice'], 500
    else:
        return operation['advice'], 400


def conduct_operation(json):
    match json['operation']:
        case 'createItem':
            match json['system']:
                case 'items':
                    return create_item(json)
                case 'conversations':
                    return create_conversation(json)
                case 'developers':
                    return create_developer(json)
                case 'codefiles':
                    return create_codefile(json)
                case _:
                    return unsupported_operation(json)
        case 'importItems':
            match json['system']:
                case 'items':
                    return import_items(json)
                case _:
                    return unsupported_operation(json)
        case 'exportItems':
            match json['system']:
                case 'items':
                    return export_items(json)
                case _:
                    return unsupported_operation
        case 'updateItem':
            match json['system']:
                case 'items':
                    return update_item(json)
                case 'conversations':
                    return update_conversation(json)
                case 'codefiles':
                    return update_item(json)
                case _:
                    return unsupported_operation(json)
        case 'createDetail':
            match json['system']:
                case 'items':
                    return create_detail(json)
                case 'conversations':
                    return create_message(json)
                case 'developers':
                    return create_developer_message(json)
                case _:
                    return unsupported_operation(json)
        case 'nullifyItem':
            match json['system']:
                case 'items':
                    return nullify_item(json)
                case 'conversations':
                    return nullify_conversation(json)
                case _:
                    return unsupported_operation(json)
        case 'higherItem':
            match json['system']:
                case 'items':
                    return higher_item(json)
                case _:
                    return unsupported_operation(json)
        case 'lowerItem':
            match json['system']:
                case 'items':
                    return lower_item(json)
                case _:
                    return unsupported_operation(json)
        case 'topItem':
            match json['system']:
                case 'items':
                    return top_item(json)
                case _:
                    return unsupported_operation(json)
        case 'bottomItem':
            match json['system']:
                case 'items':
                    return bottom_item(json)
                case _:
                    return unsupported_operation(json)
        case 'updateDetail':
            match json['system']:
                case 'items':
                    return update_detail(json)
                case _:
                    return unsupported_operation(json)
        case 'nullifyDetail':
            match json['system']:
                case 'items':
                    return nullify_detail(json)
                case _:
                    return unsupported_operation(json)
        case _:
            return """
                        <style>
                            body {
                                background-color: black;
                                color:white;
                                font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
                            }
                        </style>
                        <span>
                            <strong>Client Error:</strong> Invalid request parameter: <strong>Operation</strong>.
                        </span>
                    """, 400


def invalid_operation(parameter):
    return {'valid': False, 'advice': f'The parameter(s) *{parameter}* is/are missing from the request.'}


def unsuccessful_operation(json):
    return {'valid': False, 'successful': False, 'advice': 'The request was valid but the database operation failed.'}


def unsupported_operation(json):
    return {'valid': False, 'successful': False, 'advice': f'The operation *{json["operation"]}* is not supported by system *{json["system"]}*.'}


def deliberate_failure():
    return {'valid': True, 'successful': False, 'advice': 'The operation failed successfully.'}


def create_item(json):
    # return deliberate_failure() # For testing (simulated server issue).
    operation = dict()
    if json['data']['name']:
        operation['valid'] = True
    else:
        return invalid_operation('item name')
    try:
        con = sqlite3.connect(db)
        con.row_factory = dict_factory
        cur = con.cursor()
        res = cur.execute("SELECT COUNT(*) as count FROM items WHERE context = ? AND system = ? AND rank NOT NULL", (json['context'], json['system'],))
        count = res.fetchone()['count']
        rank = count + 1
        cur.execute("INSERT INTO items(name, rank, context, system) VALUES( ?, ?, ?, ?)", (json['data']['name'], rank, json['context'], json['system'],))
        con.commit()
        res = cur.execute("SELECT id FROM items WHERE context = ? AND system = ? AND rank = ?", (json['context'], json['system'], rank,))
        item_id = res.fetchone()['id']
        cur.close()
        con.close()
        operation['successful'] = True
        operation['response'] = dict(id=item_id, rank=rank)
        return operation
    except Exception as error:
        print(error)
        return unsuccessful_operation(json)


def create_conversation(json):
    # return deliberate_failure() # For testing (simulated server issue).
    operation = dict()
    if json['data']['name']:
        operation['valid'] = True
    else:
        return invalid_operation('item name')
    try:
        con = sqlite3.connect(db)
        con.row_factory = dict_factory
        cur = con.cursor()
        res = cur.execute("SELECT COUNT(*) as count FROM items WHERE context = ? AND system = ? AND rank NOT NULL", (json['context'], json['system'],))
        count = res.fetchone()['count']
        rank = count + 1
        cur.execute("INSERT INTO items(name, rank, context, system) VALUES( ?, ?, ?, ?)", (json['data']['name'], rank, json['context'], json['system'],))
        con.commit()
        res = cur.execute("SELECT id FROM items WHERE context = ? AND system = ? AND rank = ?", (json['context'], json['system'], rank,))
        item_id = res.fetchone()['id']
        cur.close()
        con.close()
        operation['successful'] = True
        operation['response'] = dict(id=item_id, rank=rank)
        return operation
    except Exception as error:
        print(error)
        return unsuccessful_operation(json)


def create_developer(json):
    # return deliberate_failure() # For testing (simulated server issue).
    operation = dict()
    if json['data']['name']:
        operation['valid'] = True
    else:
        return invalid_operation('item name')
    try:
        con = sqlite3.connect(db)
        con.row_factory = dict_factory
        cur = con.cursor()
        res = cur.execute("SELECT COUNT(*) as count FROM items WHERE context = ? AND system = ? AND rank NOT NULL", (json['context'], json['system'],))
        count = res.fetchone()['count']
        rank = count + 1
        cur.execute("INSERT INTO items(name, rank, context, system) VALUES( ?, ?, ?, ?)", (json['data']['name'], rank, json['context'], json['system'],))
        con.commit()
        res = cur.execute("SELECT id FROM items WHERE context = ? AND system = ? AND rank = ?", (json['context'], json['system'], rank,))
        item_id = res.fetchone()['id']
        cur.close()
        con.close()
        operation['successful'] = True
        operation['response'] = dict(id=item_id, rank=rank)
        return operation
    except Exception as error:
        print(error)
        return unsuccessful_operation(json)


def create_codefile(json):
    # return deliberate_failure() # For testing (simulated server issue).
    operation = dict()
    if json['data']['name']:
        operation['valid'] = True
    else:
        return invalid_operation('item name')
    try:
        con = sqlite3.connect(db)
        con.row_factory = dict_factory
        cur = con.cursor()
        res = cur.execute("SELECT COUNT(*) as count FROM items WHERE context = ? AND system = ? AND rank NOT NULL", (json['context'], json['system'],))
        count = res.fetchone()['count']
        rank = count + 1
        cur.execute("INSERT INTO items(name, rank, context, system) VALUES( ?, ?, ?, ?)", (json['data']['name'], rank, json['context'], json['system'],))
        con.commit()
        res = cur.execute("SELECT id FROM items WHERE context = ? AND system = ? AND rank = ?", (json['context'], json['system'], rank,))
        item_id = res.fetchone()['id']
        cur.close()
        con.close()
        operation['successful'] = True
        operation['response'] = dict(id=item_id, rank=rank)
        return operation
    except Exception as error:
        print(error)
        return unsuccessful_operation(json)


import csv
def import_items(json):
    operation = dict()
    if json['data']['csvString']:
        operation['valid'] = True
    else:
        return invalid_operation('CSV data')
    csvfile = 'csvfiles/tmp.csv'
    try:
        con = sqlite3.connect(db)
        con.row_factory = dict_factory
        cur = con.cursor()
        # Create a csv file using the csvstring. There might be a way to do this without creating a file.
        with open(csvfile, mode='w', encoding='utf-8') as file:
            file.write(json['data']['csvString'])
        # Convert the csv file data to a list of data.
        # It is assumed that there is no header row, and the format is item name, detail content 1, detail content 2, detail content 3, etc., etc..
        rows = []
        with open(csvfile, mode='r', newline='', encoding='utf-8') as file:
            reader = csv.reader(file)
            for row in reader:
                rows.append(row)
        clean_rows = []
        for i, row in enumerate(rows):
            clean_rows.append([])
            for l in row:
                if l != '':
                    clean_rows[i].append(l)
            
                # Now each row in this list is a row of data in the format told above.
        # Insert each row into the database, and at the same time package the data for the response to the client. Create the package in such a way that the client can add them by looping on a system method.
        client_package = dict()
        client_package['items'] = list()
        res = cur.execute("SELECT COUNT(*) AS count FROM items WHERE context = ? AND system = ? AND rank NOT NULL", (json['context'], json['system'],))
        count = res.fetchone()['count']
        rank = count + 1
        for i, row in enumerate(clean_rows):
            # For each row, the first item is the item name. Insert that item into the database, and retrieve its id. (You already have the system and context and name.)
            cur.execute("INSERT INTO items(name, rank, context, system) VALUES( ?, ?, ?, ?)", (row[0], rank, json['context'], json['system'],))
            con.commit()
            res = cur.execute("SELECT id FROM items WHERE context = ? AND system = ? AND rank = ?", (json['context'], json['system'], rank))
            # con.commit()
            item_id = res.fetchone()['id']
            # Add that item's data to the client's package.
            client_package['items'].append({
                'id': item_id,
                'name': row[0],
                'rank': rank,
                'details': list()
            })
            rank += 1
            # insert the details for that item using the item id retrieved earlier.
            details = row[1:]
            item_details = client_package['items'][i]['details']
            detail_rank = 1
            for content in details:
                cur.execute("INSERT INTO details(item_id, role, content, rank) VALUES(?, ?, ?, ?)", (item_id, 'user', content, detail_rank,))
                con.commit()
                # Also add the details informations to the client package.
                item_details.append({
                    'content': content,
                    'rank': detail_rank,
                    'role': 'user'
                })
                detail_rank += 1
        operation['response'] = client_package
        cur.close()
        con.close()
        operation['successful'] = True
        return operation
    except Exception as error:
        print(error)
        return unsuccessful_operation(json)


def export_items(json):
    operation = dict()
    if json['data']['name']:
        operation['valid'] = True
    else:
        return invalid_operation('item name')
    try:
        operation['response'] = dict(message='Nothing to do.', name=json['data']['name'])
        operation['successful'] = True
        return operation
    except Exception as error:
        print(error)
        return unsuccessful_operation(json)


def update_item(json):
    # return deliberate_failure() # For testing (simulated server issue).
    operation = dict()
    if json['data']['name'] and json['data']['id']:
        operation['valid'] = True
    else:
        return invalid_operation('item name, item id')
    try:
        con = sqlite3.connect(db)
        con.row_factory = dict_factory
        cur = con.cursor()
        cur.execute("UPDATE items SET name = ? WHERE id = ?", (json['data']['name'], json['data']['id'],))
        con.commit()
        cur.close()
        con.close()
        operation['successful'] = True
        operation['response'] = dict(message='Nothing needed.')
        return operation
    except Exception as error:
        print(error)
        return unsuccessful_operation(json)


def update_conversation(json):
    # return deliberate_failure() # For testing (simulated server issue).
    operation = dict()
    if json['data']['name'] and json['data']['id']:
        operation['valid'] = True
    else:
        return invalid_operation('item name, item id')
    try:
        con = sqlite3.connect(db)
        con.row_factory = dict_factory
        cur = con.cursor()
        cur.execute("UPDATE items SET name = ? WHERE id = ?", (json['data']['name'], json['data']['id'],))
        con.commit()
        cur.close()
        con.close()
        operation['successful'] = True
        operation['response'] = dict(message='Nothing needed.')
        return operation
    except Exception as error:
        print(error)
        return unsuccessful_operation(json)


def create_detail(json): # Nothing needed to be returned.
    # return deliberate_failure() # For testing (simulated server issue).
    operation = dict()
    if json['data']['content'] and json['data']['id']:
        operation['valid'] = True
    else:
        return invalid_operation('content', 'item id')
    try:
        con = sqlite3.connect(db)
        con.row_factory = dict_factory
        cur = con.cursor()
        res = cur.execute("SELECT COUNT(*) as count FROM details WHERE item_id = ? AND rank NOT NULL", (json['data']['id'],))
        count = res.fetchone()['count']
        rank = count + 1
        cur.execute("INSERT INTO details(item_id, role, content, rank) VALUES(?, ?, ?, ?)", (json['data']['id'], 'user', json['data']['content'], rank,))
        con.commit()
        cur.close()
        con.close()
        operation['successful'] = True
        operation['response'] = dict(message='Nothing to do.')
        return operation
    except Exception as error:
        print(error)
        return unsuccessful_operation(json)    


def nullify_item(json): # Nothing needed to be returned.
    """  Updates the database with new ranks for the selected and affected items."""
    # return deliberate_failure() # For testing (simulated server issue).
    operation = dict()
    if not json['data']['id']:
        return invalid_operation('item id')
    else:
        operation['valid'] = True
    try:
        con = sqlite3.connect(db)
        con.row_factory = dict_factory
        cur = con.cursor()
        # get the ids of the affected item
        res = cur.execute("SELECT rank FROM items WHERE id = ?", (json['data']['id'],))
        item_rank = res.fetchone()['rank']
        res = cur.execute("SELECT id, rank FROM items WHERE context = ? AND system = ? AND rank > ?", (json['context'], json['system'], item_rank))
        affected_items = res.fetchall()
        # Update the items with their new ranks
        data = [(None, json['data']['id'])]
        for affected_item in affected_items:
            data.append((affected_item['rank'] - 1, affected_item['id']))
        cur.executemany("UPDATE items SET rank = ? WHERE id = ?", data)
        con.commit()
        cur.close()
        con.close()
        operation['successful'] = True
        operation['response'] = dict(message='Nothing to do.')
        return operation
    except Exception as error:
        print(error)
        return unsuccessful_operation(json)


def nullify_conversation(json): # Nothing needed to be returned.
    """  Updates the database with new ranks for the selected and affected items."""
    # return deliberate_failure() # For testing (simulated server issue).
    operation = dict()
    if not json['data']['id']:
        return invalid_operation('item id')
    else:
        operation['valid'] = True
    try:
        con = sqlite3.connect(db)
        con.row_factory = dict_factory
        cur = con.cursor()
        # get the ids of the affected item
        res = cur.execute("SELECT rank FROM items WHERE id = ?", (json['data']['id'],))
        item_rank = res.fetchone()['rank']
        res = cur.execute("SELECT id, rank FROM items WHERE context = ? AND system = ? AND rank > ?", (json['context'], json['system'], item_rank))
        affected_items = res.fetchall()
        # Update the items with their new ranks
        data = [(None, json['data']['id'])]
        for affected_item in affected_items:
            data.append((affected_item['rank'] - 1, affected_item['id']))
        cur.executemany("UPDATE items SET rank = ? WHERE id = ?", data)
        con.commit()
        cur.close()
        con.close()
        operation['successful'] = True
        operation['response'] = dict(message='Nothing to do.')
        return operation
    except Exception as error:
        print(error)
        return unsuccessful_operation(json)


def higher_item(json):
    """ Updates the database with new ranks for the selected and affected items."""
    # return deliberate_failure() # For testing (simulated server issue).
    operation = dict()
    if not json['data']['id']:
        return invalid_operation('item id')
    else:
        operation['valid'] = True
    try:
        con = sqlite3.connect(db)
        con.row_factory = dict_factory
        cur = con.cursor()
        # get the rank of the selected item
        res = cur.execute("SELECT rank FROM items WHERE context = ? AND system = ? AND id = ?", (json['context'], json['system'], json['data']['id'],))
        selected_item_rank = res.fetchone()['rank']
        # get the id of the affected item
        new_rank = selected_item_rank - 1
        res = cur.execute("SELECT id FROM items WHERE context = ? AND system = ? AND rank = ?", (json['context'], json['system'], new_rank,))
        affected_item_id = res.fetchone()['id']
        # Update the two items with their new ranks
        data = [
            (new_rank, json['data']['id']),
            (selected_item_rank, affected_item_id),
        ]
        cur.executemany("UPDATE items SET rank = ? WHERE id = ?", data)
        con.commit()
        cur.close()
        con.close()
        operation['successful'] = True
        operation['response'] = dict(message='Nothing to do.')
        return operation
    except Exception as error:
        print(error)
        return unsuccessful_operation(json)


def lower_item(json):
    """ Updates the database with new ranks for the selected and affected items."""
    # return deliberate_failure() # For testing (simulated server issue).
    operation = dict()
    if not json['data']['id']:
        return invalid_operation('item id')
    else:
        operation['valid'] = True
    try:
        con = sqlite3.connect(db)
        con.row_factory = dict_factory
        cur = con.cursor()
        # get the rank of the selected item
        res = cur.execute("SELECT rank FROM items WHERE context = ? AND system = ? AND id = ?", (json['context'], json['system'], json['data']['id'],))
        selected_item_rank = res.fetchone()['rank']
        # get the id of the affected item
        new_rank = selected_item_rank + 1
        res = cur.execute("SELECT id FROM items WHERE context = ? AND system = ? AND rank = ?", (json['context'], json['system'], new_rank,))
        affected_item_id = res.fetchone()['id']
        # Update the two items with their new ranks
        data = [
            (new_rank, json['data']['id']),
            (selected_item_rank, affected_item_id),
        ]
        cur.executemany("UPDATE items SET rank = ? WHERE id = ?", data)
        con.commit()
        cur.close()
        con.close()
        operation['successful'] = True
        operation['response'] = dict(message='Nothing to do.')
        return operation
    except Exception as error:
        print(error)
        return unsuccessful_operation(json)


def top_item(json):
    """  Updates the database with new ranks for the selected and affected items. """
    # return deliberate_failure() # For testing (simulated server issue).
    operation = dict()
    if not json['data']['id']:
        return invalid_operation('item id')
    else:
        operation['valid'] = True
    try:
        con = sqlite3.connect(db)
        con.row_factory = dict_factory
        cur = con.cursor()
        # get the rank of the selected item
        res = cur.execute("SELECT rank FROM items WHERE context = ? AND system = ? AND id = ?", (json['context'], json['system'], json['data']['id'],))
        selected_item_rank = res.fetchone()['rank']
        # get the ids of the affected item
        res = cur.execute("SELECT id, rank FROM items WHERE context = ? AND system = ? AND rank < ?", (json['context'], json['system'], selected_item_rank,))
        affected_items = res.fetchall()
        # Update the two items with their new ranks
        data = [(1, json['data']['id'])]
        for affected_item in affected_items:
            data.append((affected_item['rank'] + 1, affected_item['id']))
        cur.executemany("UPDATE items SET rank = ? WHERE id = ?", data)
        con.commit()
        cur.close()
        con.close()
        operation['successful'] = True
        operation['response'] = dict(message='Nothing to do.')
        return operation
    except Exception as error:
        print(error)
        return unsuccessful_operation(json)


def bottom_item(json):
    """  Updates the database with new ranks for the selected and affected items. """
    # return deliberate_failure() # For testing (simulated server issue).
    operation = dict()
    if not json['data']['id']:
        return invalid_operation('item id')
    else:
        operation['valid'] = True
    try:
        con = sqlite3.connect(db)
        con.row_factory = dict_factory
        cur = con.cursor()
        # get the rank of the selected item
        res = cur.execute("SELECT rank FROM items WHERE context = ? AND system = ? AND id = ?", (json['context'], json['system'], json['data']['id'],))
        selected_item_rank = res.fetchone()['rank']
        # get the ids of the affected item
        res = cur.execute("SELECT id, rank FROM items WHERE context = ? AND system = ? AND rank > ?", (json['context'], json['system'], selected_item_rank,))
        affected_items = res.fetchall()
        # Update the two items with their new ranks
        res = cur.execute("SELECT COUNT(*) as count from items WHERE context = ? AND system = ? AND rank NOT NULL", (json['context'], json['system'],))
        count = res.fetchone()['count']
        data = [(count, json['data']['id'])]
        for affected_item in affected_items:
            data.append((affected_item['rank'] - 1, affected_item['id']))
        cur.executemany("UPDATE items SET rank = ? WHERE id = ?", data)
        con.commit()
        cur.close()
        con.close()
        operation['successful'] = True
        operation['response'] = dict(message='Nothing to do.')
        return operation
    except Exception as error:
        print(error)
        return unsuccessful_operation(json)


def update_detail(json):
    # return deliberate_failure() # For testing (simulated server issue).
    operation = dict()
    if not json['data']['id'] and json['data']['content']:
        return invalid_operation('item id')
    else:
        operation['valid'] = True
    try:
        con = sqlite3.connect(db)
        con.row_factory = dict_factory
        cur = con.cursor()
        cur.execute("UPDATE details SET content = ? WHERE item_id = ? AND rank = ?", (json['data']['content'], json['data']['id'], json['data']['rank'],))
        con.commit()
        cur.close()
        con.close()
        operation['successful'] = True
        operation['response'] = dict(message='Nothing to do.')
        return operation
    except Exception as error:
        print(error)
        return unsuccessful_operation(json)


def nullify_detail(json):
    """  Updates the database with new ranks for the selected and affected details. """
    # return deliberate_failure() # For testing (simulated server issue).
    operation = dict()
    if not json['data']['id'] and json['data']['rank']:
        return invalid_operation('item id, detail rank')
    else:
        operation['valid'] = True
    try:
        con = sqlite3.connect(db)
        con.row_factory = dict_factory
        cur = con.cursor()
        # get the ids of the affected details
        res = cur.execute("SELECT rank FROM details WHERE item_id = ? AND rank > ?", (json['data']['id'], json['data']['rank'],))
        affected_details = res.fetchall()
        # Update the details with their new ranks
        data = [(None, json['data']['id'], json['data']['rank'])]
        for affected_detail in affected_details:
            data.append((affected_detail['rank'] - 1, json['data']['id'], affected_detail['rank']))
        cur.executemany("UPDATE details SET rank = ? WHERE item_id = ? AND rank = ?", data)
        con.commit()
        cur.close()
        con.close()
        operation['successful'] = True
        operation['response'] = dict(message='Nothing to do.')
        return operation
    except Exception as error:
        print(error)
        return unsuccessful_operation(json)


def create_message(json):
    # return deliberate_failure() # For testing (simulated server issue).
    operation = dict()
    if json['data']['content'] and json['data']['id']:
        operation['valid'] = True
    else:
        return invalid_operation('content', 'item id')
    try:
        con = sqlite3.connect(db)
        con.row_factory = dict_factory
        cur = con.cursor()
        res = cur.execute("SELECT COUNT(*) as count FROM details WHERE item_id = ? AND rank NOT NULL", (json['data']['id'],))
        count = res.fetchone()['count']
        rank = count + 1
        cur.execute("INSERT INTO details(item_id, role, content, rank) VALUES(?, ?, ?, ?)", (json['data']['id'], 'user', json['data']['content'], rank,))
        con.commit()
        # generate chat completion
            # Generate the package for the ai bot
        item_package = dict()
        item_package['items'] = list()
        res = cur.execute("SELECT id, rank, name FROM items WHERE context = ? AND system = ? AND rank NOT NULL ORDER BY rank", (json['context'], 'items',))
        items = res.fetchall()
        for i, item in enumerate(items):
            item_package['items'].append({
                'name': item['name'],
                'rank': item['rank'],
                'details': list()
            })
            # select the details from the database
            # add them to the package.
            res = cur.execute("SELECT content FROM details WHERE item_id = ? AND rank NOT NULL", (item['id'],))
            details = res.fetchall()
            for detail in details:
                # put a security check here.
                item_package['items'][i]['details'].append(detail['content'])
        # generate conversation history
        res = cur.execute("SELECT role, content FROM details WHERE item_id = ? AND rank NOT NULL ORDER BY rank", (json['data']['id'],))
        conversation_history = res.fetchall()
        completion = llm_chat(conversation_history, json['data']['content'], item_package, json['context'])
        # insert chat completion to db
        rank += 1
        cur.execute("INSERT INTO details(item_id, role, content, rank) VALUES(?, ?, ?, ?)", (json['data']['id'], 'assistant', completion, rank,))
        con.commit()
        cur.close()
        con.close()
        # add chat completion to server response
        operation['successful'] = True
        operation['response'] = dict(content=completion)
        return operation
    except Exception as error:
        print(error)
        return unsuccessful_operation(json)


from pathlib import Path # For codefiles system

def create_developer_message(json):
    # return deliberate_failure() # For testing (simulated server issue).
    operation = dict()
    if json['data']['content'] and json['data']['id']:
        operation['valid'] = True
    else:
        return invalid_operation('content', 'item id')
    try:
        con = sqlite3.connect(db)
        con.row_factory = dict_factory
        cur = con.cursor()
        res = cur.execute("SELECT COUNT(*) as count FROM details WHERE item_id = ? AND rank NOT NULL", (json['data']['id'],))
        count = res.fetchone()['count']
        rank = count + 1
        cur.execute("INSERT INTO details(item_id, role, content, rank) VALUES(?, ?, ?, ?)", (json['data']['id'], 'user', json['data']['content'], rank,))
        con.commit()
        item_package = dict()
        item_package['codefiles'] = list()
        res = cur.execute("SELECT name FROM items WHERE context = ? AND system = ? AND rank NOT NULL ORDER BY rank", (json['context'], 'codefiles',))
        items = res.fetchall()
        for i, item in enumerate(items):
            item_package['codefiles'].append({
                'path': item['name'],
                'contents': str()
            })
            # read the file contents from the os
            with open(f'{item["name"]}', mode = 'r') as file: # need to put error handling in here in case the file doesn't exist or there's an IO error.
                code = file.read()
            language = Path(item['name']).suffix[1:]
            contents = f'```{language}\n{code}\n```'
            # add them to the package.
            item_package['codefiles'][i]['contents'] = contents
            
        # generate conversation history
        res = cur.execute("SELECT role, content FROM details WHERE item_id = ? AND rank NOT NULL ORDER BY rank", (json['data']['id'],))
        conversation_history = res.fetchall()
        completion = llm_developer_chat(conversation_history, json['data']['content'], item_package, json['context'])
        # insert chat completion to db
        rank += 1
        cur.execute("INSERT INTO details(item_id, role, content, rank) VALUES(?, ?, ?, ?)", (json['data']['id'], 'assistant', completion, rank,))
        con.commit()
        cur.close()
        con.close()
        # add chat completion to server response
        operation['successful'] = True
        operation['response'] = dict(content=completion)
        return operation
    except Exception as error:
        print(error)
        return unsuccessful_operation(json)


@app.route('/api/contexts', methods=['GET', 'POST'])
@login_required
def contexts():
    """ Performs database operations on the contexts table and returns data to the FE if needed. """
    if request.method == 'GET':
        try:
            con = sqlite3.connect(db)
            con.row_factory = dict_factory
            cur = con.cursor()
            res = cur.execute("SELECT name, description FROM contexts")
            contexts = res.fetchall()
            with_systems = request.args.get('withSystems')
            if not with_systems:
                cur.close()
                con.close()
                api_response = jsonify(contexts=contexts)
                return api_response
            res = cur.execute("SELECT name FROM systems WHERE context = ?", (with_systems,))
            systems = res.fetchall()
            cur.close()
            con.close()
            api_response = jsonify(contexts=contexts, systems=systems)
            return api_response
        except Exception as error:
            print(error)
            return 'server error', 500
    else:
        if request.json['action'] == 'switch':
            return jsonify(dict(msg='Nothing to do')), 200
        elif request.json['action'] == 'update':
            try:
                con = sqlite3.connect(db)
                cur = con.cursor()
                cur.execute("UPDATE contexts SET name = ?, description = ? WHERE name = ?", (request.json['data']['contextNewName'], request.json['data']['description'], request.json['context'],))
                cur.execute("UPDATE items set context = ? where context = ?", (request.json['data']['contextNewName'], request.json['context'],))
                cur.execute("DELETE FROM systems WHERE context = ?", (request.json['context'],))
                if 'items' in request.json['data']:
                    cur.execute("INSERT INTO systems(name, context) VALUES('items', ?)", (request.json['data']['contextNewName'],))
                if 'conversations' in request.json['data']:
                    cur.execute("INSERT INTO systems(name, context) VALUES('conversations', ?)", (request.json['data']['contextNewName'],))
                if 'developers' in request.json['data']:
                    cur.execute("INSERT INTO systems(name, context) VALUES('developers', ?)", (request.json['data']['contextNewName'],))
                if 'codefiles' in request.json['data']:
                    cur.execute("INSERT INTO systems(name, context) VALUES('codefiles', ?)", (request.json['data']['contextNewName'],))
                con.commit()
                cur.close()
                con.close()
                api_response = jsonify(dict(context=request.json['data']['contextNewName'], description=request.json['data']['description']))
                return api_response
            except Exception as error:
                print(error)
            return 'server error', 500
        elif request.json['action'] == 'delete':
            try:
                con = sqlite3.connect(db)
                con.row_factory = dict_factory
                cur = con.cursor()
                res = cur.execute("DELETE FROM contexts WHERE name = ?", (request.json['data']['context'],))
                con.commit()
                cur.close()
                con.close()
                api_response = jsonify(dict(deletedContext=request.json['data']['context']))
                return api_response
            except Exception as error:
                print(error)
            return 'server error', 500
        elif request.json['action'] == 'create':
            try:
                context = f'New {datetime.now().strftime("%d-%m-%Y_%H-%M-%S")}'
                con = sqlite3.connect(db)
                con.row_factory = dict_factory
                cur = con.cursor()
                res = cur.execute("INSERT INTO contexts(name, description) VALUES(?, '')", (context,))
                con.commit()
                cur.close()
                con.close()
                api_response = jsonify(dict(newContext=context))
                return api_response
            except Exception as error:
                print(error)
            return 'server error', 500


if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000)
