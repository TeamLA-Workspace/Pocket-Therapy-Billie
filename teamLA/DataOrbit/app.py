from flask import Flask, request, jsonify, render_template, session
import openai
import os
import sqlite3
import random

app = Flask(__name__)
app.secret_key = "supersecretkey"

# Connect (or create) the SQLite database.
conn = sqlite3.connect("journal.db", check_same_thread=False)
cursor = conn.cursor()

# Create the journal table if it doesn't exist.
cursor.execute('''
    CREATE TABLE IF NOT EXISTS journal (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_input TEXT,
        ai_response TEXT,
        category TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
''')
conn.commit()

# Set up the OpenAI (or Groq) API client.
client = openai.OpenAI(
    api_key="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",
    base_url="https://api.groq.com/openai/v1"
)

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/set_language", methods=["POST"])
def set_language():
    """Store the user's chosen language in session."""
    data = request.json
    language = data.get("language", "English")
    session["language"] = language
    return jsonify({"message": f"Language set to {language}"})

@app.route("/chat", methods=["POST"])
def chat():
    """
    Chat route for normal therapy chat with Billie.
    """
    try:
        user_input = request.json["message"]
        category = session.get("category", "General")
        mood = request.json.get("mood", "Neutral")
        session["mood"] = mood
        language = session.get("language", "English")  # default to English if not set
        
        prompt = (
            f"The user is feeling {mood} and is discussing {category}. "
            f"Please respond in {language}, in a supportive, empathetic, and understanding manner, "
            f"tailoring your advice to their current emotional state.\n\n"
            f"User: {user_input}\n"
            "Billie:"
        )

        response = client.chat.completions.create(
            model="llama3-8b-8192",
            messages=[
                {"role": "system", "content": "You are Billie, a friendly and supportive therapy chatbot."},
                {"role": "user", "content": prompt}
            ],
        )
        bot_response = response.choices[0].message.content

        # Save conversation to DB
        cursor.execute(
            "INSERT INTO journal (user_input, ai_response, category) VALUES (?, ?, ?)",
            (user_input, bot_response, category)
        )
        conn.commit()

        return jsonify({"response": bot_response})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/journal", methods=["POST"])
def journal():
    """
    User posts a journal entry, Billie replies with a supportive reflection.
    """
    try:
        entry = request.json["entry"]
        language = session.get("language", "English")
        # Create a prompt for an empathetic reflection on the journal entry.
        prompt = (
            f"Reflect on the following journal entry in a supportive and empathetic tone. Respond in {language}.\n\n"
            f"Journal Entry: {entry}\n\n"
            "Reflection:"
        )
        response = client.chat.completions.create(
            model="llama3-8b-8192",
            messages=[
                {"role": "system", "content": "You are Billie, a compassionate AI therapist providing reflective feedback."},
                {"role": "user", "content": prompt}
            ],
        )
        ai_response = response.choices[0].message.content

        # Save the journal entry with its AI reflection.
        cursor.execute(
            "INSERT INTO journal (user_input, ai_response, category) VALUES (?, ?, ?)",
            (entry, ai_response, "Journal")
        )
        conn.commit()

        return jsonify({"response": ai_response})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/journal_entries", methods=["GET"])
def journal_entries():
    """
    Returns all Journal entries from the database.
    """
    try:
        cursor.execute("SELECT user_input, ai_response, timestamp FROM journal WHERE category='Journal' ORDER BY timestamp DESC")
        rows = cursor.fetchall()
        entries = [{"user_input": row[0], "ai_response": row[1], "timestamp": row[2]} for row in rows]
        return jsonify({"entries": entries})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/clear_journal", methods=["POST"])
def clear_journal():
    """
    Removes all journal entries from the DB in 'Journal' category.
    """
    try:
        cursor.execute("DELETE FROM journal WHERE category='Journal'")
        conn.commit()
        return jsonify({"message": "Journal cleared successfully."})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/inspire", methods=["GET"])
def inspire():
    """
    Returns a random uplifting quote (Inspire Me feature).
    """
    quotes = [
        "You are stronger than you think.",
        "Every day is a fresh start.",
        "You have the power to create change.",
        "Believe in yourself and all that you are.",
        "This too shall pass, and you will grow from it."
    ]
    quote = random.choice(quotes)
    return jsonify({"quote": quote})

@app.route("/cbt_exercise", methods=["POST"])
def cbt_exercise():
    """
    Allows user to do a structured CBT exercise with Billie's guidance.
    The user sends their negative thought, and Billie helps restructure it.
    """
    try:
        user_thought = request.json.get("thought", "")
        language = session.get("language", "English")
        prompt = (
            f"Help the user apply a CBT approach to this negative thought. Respond in {language}.\n\n"
            f"Negative Thought: {user_thought}\n\n"
            "Steps: Identify the cognitive distortion, challenge it with evidence, propose a healthier perspective."
        )
        response = client.chat.completions.create(
            model="llama3-8b-8192",
            messages=[
                {"role": "system", "content": "You are Billie, a helpful therapy chatbot specialized in CBT."},
                {"role": "user", "content": prompt}
            ],
        )
        cbt_response = response.choices[0].message.content
        return jsonify({"response": cbt_response})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True)
