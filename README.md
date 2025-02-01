# InContext

InContext makes conversations with your LLM more efficient by making the responses more relevant and useful.

A dynamic system message is inserted at the beginning of each conversation with the purpose of improving the LLM's situational awareness, and including contextual data.

The result: more useful responses and faster conversations.

## Setup Instructions for a Development Server

- `export OPENAI_API_KEY='your_openai_api_key'`
- `export ANTHROPIC_API_KEY='your_anthropic_api_key'`
- `sudo apt update && sudo apt upgrade`
- `sudo apt install sqlite3`
- `python3 -m venv .venv`
- `source .venv/bin/activate`
- `pip install --upgrade pip`
- `pip install openai`
- `pip install anthropic`
- `pip install flask`
- `pip install flask-session`
- `git clone git@github.com:jkgarber/InContext.git`
- `python3 inContext.py <user_name>`

## User Guide

This user guide provides a high-level overview of the key features and functionalities and exposes you to the key terms and concepts involved. Afterwards, for a more hands-on how-to, check out the tutorial which'll walk you through the app with an example use case.

### 1. Page Layout

The page layout (i.e. user interface) consists of three key sections.

|Section|Description|
|-|-|
|Context Owner|Controls allowing the user to create a new context and/or delete the current context.|
|Context Manager|A display showing info about the current context, and controls for editing the current context and/or switching to a different context.|
|Context|A container for context-specific data and conversations.|

### 2. Contexts

A context provides a space for systems to process data. (For more information on systems, see *3. Systems*, below.)

Each context has a name and a description. Both of these properties are decided by the user.

The user can create and delete contexts using the buttons in the context owner section.

Once the user creates a context, he can edit the name, description, and associated systems by clicking on the edit button in the top-right corner of the context manager section.

### 3. Systems

A system is a virtual device for processing and displaying data for the user.

Each system instance has a name and a related context.

The system name determines which data processes occur within the system. The app currently supports two systems: *Items* and *Conversations*.

### 4. Items

To avoid confusion, a distinction needs to be made between the different meanings of the word *Items*:

- **As a System**: Items is the name of the system with which the user stores and displays their contextual data. (See *3. Systems*, above.)
- **As a Data Type**: An item is a kind of datum put into a system by the user.

This section is about the latter meaning, that of items as pieces of data provied by the user.

You can think of items as a sort of item in a list, like a list of todo items, a list of requirements, a list of your favorite movies, or as we'll see later as well, a list of conversations.

Each item has an id, a name, a rank, a related system, and a related context.

Markdown is supported for item names.

In addition to serving as an item in a list, an item can also serve as a container for more data, like a column in a table. In this metaphor, item name corresponds to column name. The data in the rows are called details.

As a user, in terms of items, you can:

- create (i.e. set a *name* attribute)
- update (i.e. change the *name* attribute)
- import and export (with details) (in bulk)
- rank (i.e. extending the table column metaphor: rearrange the columns)
    - rank higher
    - rank top
    - rank lower
    - rank bottom

### 5. Details

A Detail, like an item, is also a piece of data, Details are provided either by the user, or by the LLM.

A detail can be thought of as a subitem, which can be, for example, harking back to the examples provided above about items, a due date for a todo, a version of a requirement, a reason why you love a particular movie, or a message in a conversation.

Each detail has an item id, a role, content, and a rank.

Markdown is supported for the content of details.

As mentioned in the section about systems, there are two systems: Items and Conversations. In the Items system, details are always controlled by the user, who can create, update, and delete the contents of details.

### 6. Conversations

In the Conversations system, details take the form of messages in a conversation between the user and the LLM.

To have a conversation with the LLM, the user must first create the conversation container (i.e. the item) in the Conversations system, and then create the first message (i.e. the first detail).

With the conversation, the LLM receives a system-role instruction for situational awareness (i.e. that the user is accessing it through this app) and contextual information (the items and details in json-like format).

## Tutorial

*Example Use Case: Movie Recommendation Based on Favorite Movies.*

Follow the steps below to learn the basics and experience an example use case for the very first time!

### 1. Create a new context containing both systems.

1. Click on *Create new context* in the top-right corner of the screen. You will be redirected to a new page which displays the new context. The context has been given a default name with the format *New DD-MM-YYYY_HH-MM-SS*.
2. Click on the edit button to the right of the context name, all the way at the right edge of the screen.
3. Change the *name* to *Movie Choosing*.
4. In the *description* field, put *Let's all add our favourite movies and then ask ChatGPT to recommend one we'll all enjoy! Make sure to also add a detail about why you like that movie!*
5. In the *Systems* field, put `items,conversations`.
6. Click the *checkmark* button to confirm the changes. The page will refresh and you should now see the applied changes, most notably the addition of the two systems: Items and Conversations.

### 2. Add an item with the name of your favourite movie.

1. Click on the *Create* button in the *Items* system.
2. Enter the name of your favourite movie followed by the year it was released.
3. Click the *checkmark* button to confirm. The item is now saved in the Items system and is being displayed.

### 3. Add a detail containing the reason why you like that movie.

1. Double-click on the item you just created. It now has a white border and expanded in size. This indicates it's been selected and is showing the related details. (There are no details yet so it's devoid of content, apart from the name of the movie and the year it was released.)
2. If you made a mistake when adding the movie, click on *Update*. Then you can fix it, and click on the *checkmark* button to confirm.
3. Re-select the item if needed. (You might have made an action which caused a de-selection, such as clicking off the item, or closing a form.)
4. Click on *Create*. This will open the form again, except this time it's enabling you to add a detail. (For more information about interacting with items and details, see *Help: Selecting and De-selecting Items and Details*, below.)
5. Enter some text explaining why you like that particular movie, and confirm by clicking the *checkmark* button. Now the detail has been added to the item.

### 4. Ask your friends to each add their own item for their favourite movie.

- Refer to the instructions in step 2.

### 5. Ask them to add a detail explaining why they like it.

- Refer to the instructions in step 3.

### 6. Ask the LLM to recommend a movie that you will all enjoy.

1. Click on the *Create* button in the *Conversations* system.
2. Enter the name of the conversation: "Choosing a movie on {{ today's date }}.
3. Click the *checkmark* button to confirm. The conversation item is now saved in the Conversations system and is being displayed.
4. Double-click on the conversation item.
5. Click the *Create* button to start the conversation. Ask ChatGPT to recommend a movie by creating a message: "Hi there, I made a list of mine and my friends' favourite movies with reasons as to why we enjoy those particular movies so much. Based on this information, can you reccommend a movie that we'll all enjoy?"
6. If needed, continue the conversation with ChatGPT by sending further messages. To do so, use the *Create* button while the conversation is selected.

## Help: Selecting and De-selecting Items and Details

If you have an issue with selecting an item or a detail, please read this article. It aims to provide complete clarity on how item and detail selection works.

### Item selection and displaying details

There are two ways to select an item:

- Click on the unselected item to select it.
- Double-click on the unselected item to select it.

Double-clicking the item has the added effect of showing the details for that item.

You can only select one item at a time per system. To select another item you must first de-select the currently selected item. There are two ways to de-select an item:

- Click on the selected item to de-select it.
- Click on the system (anywhere that's not an item) to de-select the selected item.

You can toggle (i.e. show/hide) the detail display of any item without selecting it. You might want to do this when you have an item selected and  want to view the details of another item without changing the selection:

- Ctrl+click on any item to toggle the detail display whether it's selected or not.
- Double-click on any item to toggle the detail display whether it's selected or not.

Double-clicking an item has the added effect of selecting the item. (That is unless there's an already-selected item.)

Selected items maintain their selected status upon double-click. Just the detail display will be toggled.

### Detail selection

You can select a detail as long as it's related to the currently selected item.

You do not have to deselect a detail to select another detail.

You cannot update an item if there is a selected detail. To de-select a selected detail, so that, for example, you can access the update button to update the related item, simply click on the selected detail.

Clicking on the system (anywhere that's not an item) will also de-select the selected detail, and the item will also be deselected.

### A note on closing forms

Cancelling a form by clicking on the *cross* button will cause a full de-selection on any selected item or detail for that system.
