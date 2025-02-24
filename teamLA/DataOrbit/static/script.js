document.addEventListener("DOMContentLoaded", function() {
            /* -------------------------------------------------
             * GLOBAL VARIABLES & SETTINGS
             * ------------------------------------------------- */
            let userMood = "";
            let selectedLanguage = "en-US"; // Default speech code (English US)
            const chatbotName = "Billie";
            const defaultTopic = "General";

            // A map of user-friendly language to BCP-47 codes (for TTS/STT)
            const languageMap = {
                "English": "en-US",
                "Spanish": "es-ES",
                "French": "fr-FR",
                "German": "de-DE"
                    // Add more if needed
            };

            // Web Speech API for speech recognition (if available)
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            let recognition;
            if (SpeechRecognition) {
                recognition = new SpeechRecognition();
                recognition.continuous = false;
                recognition.interimResults = false;
                // We'll set recognition.lang dynamically in startVoiceInput()
            }

            /* -------------------------------------------------
             * MARKDOWN PARSER
             * (Naive approach for bold/italic)
             * ------------------------------------------------- */
            function parseMarkdownToHtml(text) {
                // Convert **bold** → <strong> and *italic* → <em>
                // This is a simple example; you can expand for more features
                let html = text
                    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>") // **bold**
                    .replace(/\*(.+?)\*/g, "<em>$1</em>"); // *italic*
                return html;
            }

            /* -------------------------------------------------
             * TEXT-TO-SPEECH (TTS)
             * ------------------------------------------------- */
            function speakText(text) {
                if (!window.speechSynthesis) return; // Not supported in older browsers
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.lang = selectedLanguage; // e.g., "en-US"
                window.speechSynthesis.speak(utterance);
            }

            /* -------------------------------------------------
             * MAIN DISPLAY FUNCTION FOR BILLIE'S RESPONSES
             * ------------------------------------------------- */
            function displayBillieResponse(message) {
                const chatbox = document.getElementById("chatbox");

                // Create container for Billie's response bubble
                const botBubble = document.createElement("div");
                botBubble.className = "flex items-start space-x-2 mb-2";

                // Billie's image
                const botImg = document.createElement("img");
                botImg.src = "/static/images/billie-bird.png";
                botImg.alt = "Billie";
                botImg.className = "w-8 h-8 rounded-full object-cover";
                botBubble.appendChild(botImg);

                // Text bubble
                const botText = document.createElement("span");
                botText.className = "inline-block bg-gray-200 text-gray-900 p-2 rounded-lg";
                botBubble.appendChild(botText);

                // Append to chatbox
                chatbox.appendChild(botBubble);
                chatbox.scrollTop = chatbox.scrollHeight;

                // Convert Markdown to HTML
                const parsedHtml = parseMarkdownToHtml(message);

                // Typing effect: type raw text, then swap for HTML
                let i = 0;
                let tempText = "";

                function typeLetter() {
                    if (i < message.length) {
                        tempText += message.charAt(i);
                        botText.textContent = tempText; // show typed characters
                        i++;
                        setTimeout(typeLetter, 30);
                    } else {
                        // After finishing typing, replace text with the final parsed HTML
                        botText.innerHTML = parsedHtml;
                        // Optionally speak the text
                        speakText(message);
                    }
                }
                typeLetter();
            }

            /* -------------------------------------------------
             * JOURNAL REFLECTION (SIMILAR TYPING + MARKDOWN PARSING)
             * ------------------------------------------------- */
            function displayJournalReflection(message, container) {
                // container is typically "journalBox" or an element in the CBT modal
                const reflectionContainer = document.createElement("div");
                reflectionContainer.className = "flex items-start space-x-2 mb-2 mt-2";

                const reflectionImg = document.createElement("img");
                reflectionImg.src = "/static/images/billie-bird.png";
                reflectionImg.alt = "Billie";
                reflectionImg.className = "w-8 h-8 rounded-full object-cover";
                reflectionContainer.appendChild(reflectionImg);

                const reflectionText = document.createElement("span");
                reflectionText.className = "inline-block bg-gray-200 text-gray-900 p-2 rounded-lg";
                reflectionContainer.appendChild(reflectionText);

                container.appendChild(reflectionContainer);
                container.scrollTop = container.scrollHeight;

                const parsedHtml = parseMarkdownToHtml(message);

                let i = 0;
                let tempText = "";

                function typeLetter() {
                    if (i < message.length) {
                        tempText += message.charAt(i);
                        reflectionText.textContent = tempText;
                        i++;
                        setTimeout(typeLetter, 30);
                    } else {
                        reflectionText.innerHTML = parsedHtml;
                        speakText(message);
                    }
                }
                typeLetter();
            }

            /* -------------------------------------------------
             * LANGUAGE SELECTION
             * ------------------------------------------------- */
            window.selectLanguage = function(langName) {
                // e.g., "English"
                selectedLanguage = languageMap[langName] || "en-US";

                // Update the server's session language
                fetch("/set_language", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ language: langName })
                    })
                    .then(res => res.json())
                    .then(data => console.log(data.message))
                    .catch(err => console.error(err));
            };

            /* -------------------------------------------------
             * MOOD SELECTION
             * ------------------------------------------------- */
            window.selectMood = function(mood) {
                userMood = mood;

                // Hide the large Billie image and caption
                const billieIntro = document.getElementById("billie-intro");
                if (billieIntro) {
                    billieIntro.classList.add("hidden");
                }

                // Hide mood selection, show chat container
                const moodSection = document.getElementById("mood-selection");
                const chatContainer = document.getElementById("chat-container");
                if (moodSection && chatContainer) {
                    moodSection.classList.add("hidden");
                    chatContainer.classList.remove("hidden");
                } else {
                    console.error("Error: 'mood-selection' or 'chat-container' not found.");
                }

                // Initial prompt
                document.getElementById("chatbox").innerHTML = `
      <div class="text-left">
        <span class="inline-block bg-gray-200 text-gray-900 p-2 rounded-lg">
          You're feeling ${userMood}. Let's talk about it. How can I help you today?
        </span>
      </div>
    `;

                // If mood is low, add "Get Help" button
                if (mood === "Down" || mood === "Stressed") {
                    const existingButton = document.getElementById("help-btn");
                    if (!existingButton) {
                        let helpButton = document.createElement("button");
                        helpButton.id = "help-btn";
                        helpButton.textContent = "Get Help";
                        helpButton.className = "ml-2 px-4 py-2 bg-red-500 text-white rounded-lg";
                        helpButton.onclick = function() {
                            document.getElementById("help-modal").classList.remove("hidden");
                        };
                        chatContainer.prepend(helpButton);
                    }
                }
            };

            /* -------------------------------------------------
             * CHAT (TEXT) & VOICE INPUT
             * ------------------------------------------------- */
            window.sendChatMessage = function() {
                const inputField = document.getElementById("user-input");
                const userMessage = inputField.value.trim();
                if (!userMessage) return;

                const chatbox = document.getElementById("chatbox");

                // Show user bubble
                chatbox.innerHTML += `
      <div class="text-right">
        <span class="inline-block bg-blue-200 text-blue-900 p-2 rounded-lg">
          ${userMessage}
        </span>
      </div>
    `;
                inputField.value = "";
                chatbox.scrollTop = chatbox.scrollHeight;

                // Send to server
                fetch("/chat", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            message: userMessage,
                            mood: userMood,
                            topic: defaultTopic
                        })
                    })
                    .then(response => response.json())
                    .then(data => {
                        if (data.error) {
                            console.error(data.error);
                            return;
                        }
                        // Display typed response with markdown support
                        displayBillieResponse(data.response);
                    })
                    .catch(error => console.error("Error:", error));
            };

            // Speech recognition to fill user input
            window.startVoiceInput = function() {
                if (!recognition) {
                    alert("Speech Recognition not supported in this browser.");
                    return;
                }
                // Set recognition language based on user selection
                recognition.lang = selectedLanguage;
                recognition.start();
                recognition.onresult = function(event) {
                    const transcript = event.results[0][0].transcript;
                    document.getElementById("user-input").value = transcript;
                };
            };

            /* -------------------------------------------------
             * INSPIRE ME
             * ------------------------------------------------- */
            window.getInspiration = function() {
                fetch("/inspire")
                    .then(response => response.json())
                    .then(data => {
                        // data.quote is the message
                        displayBillieResponse(data.quote);
                    })
                    .catch(error => console.error("Error:", error));
            };

            /* -------------------------------------------------
             * JOURNALING
             * ------------------------------------------------- */
            window.sendJournalEntry = function() {
                const journalInput = document.getElementById("journal-input");
                const entryText = journalInput.value.trim();
                if (!entryText) return;

                const journalBox = document.getElementById("journal-box");
                // Show user entry
                journalBox.innerHTML += `
      <div class="text-right">
        <span class="inline-block bg-green-200 text-green-900 p-2 rounded-lg">
          ${entryText}
        </span>
      </div>
    `;
                journalInput.value = "";
                journalBox.scrollTop = journalBox.scrollHeight;

                // Send to server for reflection
                fetch("/journal", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ entry: entryText })
                    })
                    .then(response => response.json())
                    .then(data => {
                        if (data.error) {
                            console.error(data.error);
                            return;
                        }
                        // Type out Billie's reflection with markdown support
                        displayJournalReflection(data.response, journalBox);
                    })
                    .catch(error => console.error("Error:", error));
            };

            window.loadJournalEntries = function() {
                    fetch("/journal_entries")
                        .then(response => response.json())
                        .then(data => {
                                const journalBox = document.getElementById("journal-box");
                                journalBox.innerHTML = "";
                                data.entries.forEach(entry => {
                                            journalBox.innerHTML += `
            <div class="mb-2 p-2 bg-white border rounded shadow">
              <p>${entry.user_input}</p>
              ${
                entry.ai_response
                  ? `<p class="mt-1 italic text-sm text-gray-700">${entry.ai_response}</p>`
                  : ""
              }
              <small class="text-gray-500">${entry.timestamp}</small>
            </div>
          `;
        });
      })
      .catch(error => console.error("Error:", error));
  };

  window.clearJournal = function() {
    if (!confirm("Are you sure you want to delete all journal entries?")) return;
    fetch("/clear_journal", { method: "POST" })
      .then(response => response.json())
      .then(data => {
        if (data.error) {
          console.error(data.error);
          return;
        }
        alert("All journal entries have been removed.");
        loadJournalEntries();
      })
      .catch(error => console.error("Error:", error));
  };

  window.toggleJournalNotepad = function() {
    const journalNotepad = document.getElementById("journal-notepad");
    if (journalNotepad.classList.contains("hidden")) {
      journalNotepad.classList.remove("hidden");
      loadJournalEntries();
    } else {
      journalNotepad.classList.add("hidden");
    }
  };

  /* -------------------------------------------------
   * CBT EXERCISES
   * ------------------------------------------------- */
  window.submitCBTThought = function() {
    const cbtInput = document.getElementById("cbt-input");
    const negativeThought = cbtInput.value.trim();
    if (!negativeThought) return;

    const cbtBox = document.getElementById("cbt-box");
    // Display user's negative thought
    cbtBox.innerHTML += `
      <div class="text-right mb-2">
        <span class="inline-block bg-red-200 text-red-900 p-2 rounded-lg">
          ${negativeThought}
        </span>
      </div>
    `;
    cbtInput.value = "";

    // Send to GPT for CBT approach
    fetch("/cbt_exercise", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ thought: negativeThought })
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          console.error(data.error);
          return;
        }
        // Type out Billie's CBT guidance with markdown support
        const cbtResp = data.response;

        // Create container for Billie's CBT response
        const cbtContainer = document.createElement("div");
        cbtContainer.className = "flex items-start space-x-2 mb-2";

        const cbtImg = document.createElement("img");
        cbtImg.src = "/static/images/billie-bird.png";
        cbtImg.alt = "Billie";
        cbtImg.className = "w-8 h-8 rounded-full object-cover";
        cbtContainer.appendChild(cbtImg);

        const cbtText = document.createElement("span");
        cbtText.className = "inline-block bg-gray-200 text-gray-900 p-2 rounded-lg";
        cbtContainer.appendChild(cbtText);

        cbtBox.appendChild(cbtContainer);

        // Type effect with final HTML swap
        const parsedHtml = parseMarkdownToHtml(cbtResp);
        let i = 0;
        let tempText = "";
        function typeLetter() {
          if (i < cbtResp.length) {
            tempText += cbtResp.charAt(i);
            cbtText.textContent = tempText;
            i++;
            setTimeout(typeLetter, 30);
          } else {
            cbtText.innerHTML = parsedHtml;
            speakText(cbtResp);
          }
        }
        typeLetter();
      })
      .catch(err => console.error(err));
  };

  window.openCBT = function() {
    document.getElementById("cbt-modal").classList.remove("hidden");
  };
  window.closeCBT = function() {
    document.getElementById("cbt-modal").classList.add("hidden");
  };

  /* -------------------------------------------------
   * MEDITATION MODAL
   * ------------------------------------------------- */
  window.openMeditation = function() {
    document.getElementById("meditation-modal").classList.remove("hidden");
  };
  window.closeMeditation = function() {
    document.getElementById("meditation-modal").classList.add("hidden");
  };

  /* -------------------------------------------------
   * HOME BUTTON
   * ------------------------------------------------- */
  window.goHome = function() {
    window.location.href = "/";
  };
});