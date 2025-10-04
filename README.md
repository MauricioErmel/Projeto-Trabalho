# Case Manager

A simple, client-side web application for managing cases. The purpose for this tool is to help me store information regarding my day to day job in order to have easy access for the history of tasks I completed.

## Features

*   **Case Management:** Create, edit, and manage cases with details such as title, case number, and launch date.
*   **Tabbed Interface:** Easily switch between active cases using a dynamic tab system.
*   **Rich Case Information:** Add detailed information to each case, including:
    *   A **case diary** with timestamped entries (supports Markdown).
    *   A **checklist** to track tasks for each case.
    *   **Tags** for categorizing and filtering cases.
    *   **CS Files** with details like name, URL, profile, collection, and product ID.
*   **Case Status:** Mark cases with special statuses like "Special Project," "Can Launch Sooner," "Content Automated," and "Post-live."
*   **Archive and Views:** Archive completed cases and switch between different views for active, archived, and post-live cases.
*   **Pending Tasks:** View a consolidated list of all pending tasks from all cases.
*   **Data Persistence:**
    *   **Load:** Load cases from a local `baseDeCasos.txt` file (in JSON format).
    *   **Save:** Save all changes to a new timestamped `.txt` file (e.g., `baseDeCasos_YYYY-MM-DD_HH-mm.txt`).
*   **Export:** Export CS Files for a case to a `.txt` file.

## How to Use

1.  **Open `index.html`:** Open the `index.html` file in your web browser.
2.  **Load Cases:**
    *   Click the "Carregar Casos" (Load Cases) button to load an existing `baseDeCasos.txt` file.
    *   The file should contain a JSON array of case objects.
3.  **Create a New Case:**
    *   Click the "+ Novo Caso" (+ New Case) button to create a new, empty case.
4.  **Manage Cases:**
    *   Fill in the case details in the main content area.
    *   Use the tabs to switch between active cases.
    *   Add diary entries, checklist items, and tags as needed.
5.  **Save Changes:**
    *   Click the "Salvar Alterações" (Save Changes) button to download a new `.txt` file with all the current case data.

## Data Format

The application uses a JSON format to store the case data in a `.txt` file. The file should contain a single JSON array, where each element is a case object with the following structure:

```json
[
  {
    "id": "string",
    "title": "string",
    "number": "string",
    "launchDate": "datetime-local",
    "isSpecialProject": boolean,
    "canLaunchSooner": boolean,
    "isArchived": boolean,
    "isReopened": boolean,
    "isPostLive": boolean,
    "isContentAutomated": boolean,
    "diary": [
      {
        "id": "string",
        "text": "string",
        "timestamp": "ISOString"
      }
    ],
    "checklist": [
      {
        "id": "string",
        "text": "string",
        "isDone": boolean
      }
    ],
    "csFiles": [
      {
        "id": "string",
        "nome": "string",
        "url": "string",
        "profile": "string",
        "collection": "string",
        "productId": "string"
      }
    ],
    "tags": ["string"]
  }
]
```

## Technologies Used

*   **HTML5**
*   **CSS3**
*   **JavaScript (ES6+)**
*   **Showdown.js:** A JavaScript library for converting Markdown to HTML, used for the case diary.
