let icContextOwner;
let icContextManager;
let icContext;

function main() {
    document.title = `inContext/${capitalizeString(CONTEXT)}`;
    icContextManager = new IcContextManager();
    document.body.appendChild(icContextManager);
    icContextOwner = new IcContextOwner();
    document.body.prepend(icContextOwner);
    icContext = new IcContext();
    document.body.appendChild(icContext);
}


class IcContextOwner extends HTMLElement {
    constructor() {
        super()
    }
    connectedCallback() {
        const createButton = new IcContextControl(CONTEXT, "create", "&#10022; Create new context");
        this.appendChild(createButton);
        const deleteButton = new IcContextControl(CONTEXT, "delete", "&#8856; Delete this context");
        this.appendChild(deleteButton);
    }

    makeFilename() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');

        let filename = `${capitalizeString(CONTEXT)}_EXPORT_ON_${year}_${month}_${day}_AT_${hours}_${minutes}_${seconds}`;
        filename = filename.replace(/\s+/g, '_');
        filename = filename.replace(/[<>:"/\\|?*\x00-\x1F]/g, '');
        filename = filename.trim();
        return filename;
    }
}
customElements.define("ic-context-owner", IcContextOwner);


function capitalizeString(s) {
    return s.charAt(0).toUpperCase() + s.slice(1)
}


class IcContextManager extends HTMLElement {
    constructor() {
        super();
    }
    async connectedCallback() {
        const resource = `/api/contexts?withSystems=${CONTEXT}`;
        try {
            const response = await fetch(resource);
            if(!response.ok) {
                throw new Error(`HTTP error: ${response.status}`);
            }
            const json = await response.json();
            const contextSwitcher = new IcContextSwitcher(json.contexts);
            this.icContextSwitcher = contextSwitcher;
            this.appendChild(contextSwitcher);
            const contextInfo = new IcContextInfo();
            this.icContextInfo = contextInfo;
            this.appendChild(contextInfo);
        } catch (error) {
            console.error(`Fetch problem: ${error.message}`);
        }
    }
    controlClicked(event) {
        event.stopPropagation
        const editorFields = icContextManager.icContextEditorFields;
        switch (this.icContextControlType) {
            case "switch":
                window.location = `/${this.icContext}`;
                break;
            case "openEditor":
                icContextManager.icContextInfo.remove();
                const icContextEditor = new IcContextEditor();
                icContextManager.prepend(icContextEditor);
                break;
            case "update":{
                icContextManager.icContextSwitcher.remove();
                const payload = new Object();
                payload.action = this.icContextEditorAction;
                payload.context = CONTEXT;
                const values = new Object();
                values.name = editorFields.name.childNodes[1].value;
                values.description = editorFields.description.childNodes[1].value;
                values.systems = editorFields.systems.childNodes[1].value;
                payload.values = values;
                icContextManager.sendClientRequest(payload);
                icContextManager.icContextEditor.remove();
                icContextManager.icContextEditor = null;
                break;
            }
            case "create": {
                const payload = new Object();
                payload.action = "create";
                icContextManager.sendClientRequest(payload);
                break;
            }
            case "delete": {
                const payload = new Object();
                payload.action = "delete";
                payload.context = CONTEXT;
                icContextManager.sendClientRequest(payload);
                break;
            }
            case "cancel":
                icContextManager.icContextEditor.remove();
                icContextManager.icContextEditor = null;
                const newContextInfo = new IcContextInfo();
                icContextManager.prepend(newContextInfo);
                icContextManager.icContextInfo = newContextInfo;
                break;
            default:
                console.error("Unexpected switch statement fall-through.");
        }
        if (editorFields) icContextManager.icContextEditorFields = null;
    }
    async sendClientRequest(payload) {
        const resource = "api/contexts";
        const options = {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        }
        try {
            const response = await fetch(resource, options);
            if(!response.ok) {
                throw new Error(`HTTP error: ${response.status}`);
            }
            const json = await response.json();
            switch (payload.action) {
                case "update": {
                    window.location = `/${json.context}`;
                    break;
                }
                case "create": {
                    window.location = `/${json.newContext}`;
                    break;
                }
                case "delete": {
                    window.location = `/`;
                    break;
                }
                default:
                    console.error("Unexpected switch statement fall-through.");
            }
        }
        catch (error) {
            console.error(`Fetch problem: ${error.message}`);
        }
    }
}
customElements.define("ic-context-manager", IcContextManager);


class IcContextInfo extends HTMLElement {
    constructor() {
        super();
        // this.icContexts = contexts;
    }
    connectedCallback() {
        const div = document.createElement("div");
        div.classList.add("heading");
        const heading = document.createElement("h1");
        heading.innerHTML = `${capitalizeString(CONTEXT)}`;
        div.appendChild(heading);
        this.appendChild(div);
        const subtitle = document.createElement("p");
        subtitle.innerHTML = DESCRIPTION;
        this.appendChild(subtitle);
        const openEditorControl = new IcContextControl(CONTEXT, "openEditor", "&#9997;");
        icContextManager.icContextEditorControl = openEditorControl;
        div.appendChild(openEditorControl);
    }
}
customElements.define("ic-context-info", IcContextInfo);


class IcContextEditor extends HTMLElement {
    constructor() {
        super();
        icContextManager.icContextEditor = this;
    }
    connectedCallback() {
        const heading = document.createElement("h3");
        heading.innerHTML = "&#9997; Edit context";
        this.appendChild(heading);
        icContextManager.icContextEditorFields = new Object();
        const spex = [
            {
                "tag": "input",
                "id": "name",
                "label": "Name",
                "value": CONTEXT
            },
            {
                "tag": "textarea",
                "id": "description",
                "label": "Description",
                "value": DESCRIPTION
            },
            {
                "tag": "textarea",
                "id": "systems",
                "label": "Systems",
                "value": Object.keys(icContext.icSystems)
            }
        ]
        const form = document.createElement("form");
        form.addEventListener("submit", (event) => {
            event.preventDefault();
            const e = new Event("click");
            icContextManager.icContextEditor.icSubmitControl.dispatchEvent(e);
        });
        const div = document.createElement("div");
        for (const spec of spex) {
            const newField = new IcContextEditorField(spec);
            form.appendChild(newField);
        }
        const controls = document.createElement("div");
        controls.classList.add("context-controls");
        const submit = new IcContextControl(CONTEXT, "update", "&check;");
        this.icSubmitControl = submit;
        submit.icContextEditorAction = "update";
        controls.appendChild(submit);
        const cancel = new IcContextControl(CONTEXT, "cancel", "&cross;");
        controls.appendChild(cancel);
        this.appendChild(form);
        this.appendChild(controls);
    }
    removeSelf() {
        icContextManager.icContextEditor = null;
        icContextManager.icContextEditorControl.classList.toggle("primed-control");
        this.remove();           
    }
}
customElements.define("ic-context-editor", IcContextEditor);


class IcContextEditorField extends HTMLElement {
    constructor(spec) {
        super();
        this.icSpec = spec;
    }
    connectedCallback() {
        const label = document.createElement("label");
        const input = document.createElement(this.icSpec.tag);
        input.id = this.icSpec.id;
        label.setAttribute("for", this.icSpec.id);
        input.value = this.icSpec.value;
        label.innerHTML = this.icSpec.label
        this.appendChild(label);
        this.appendChild(input);
        icContextManager.icContextEditorFields[input.id] = this;
    }

}
customElements.define("ic-context-editor-field", IcContextEditorField);


class IcContextSwitcher extends HTMLElement {
    constructor(contexts) {
        super();
        this.icContexts = contexts
    }
    connectedCallback() {
        const contextControls = document.createElement("div");
        this.icContextControls = contextControls;
        contextControls.classList.add("context-controls");
        for (const context of this.icContexts) {
            if (context.name != CONTEXT) {
                const control = new IcContextControl(context.name, "switch", context.name);
                contextControls.appendChild(control);
            }
        }
        this.appendChild(contextControls);
    }
    addContextControl(spec) {
        const control = new IcContextControl(spec.context, spec.type, spec.name);
        this.icContextControls.appendChild(control);
    }
    removeContextControl(context) {
        this.icContextControls.childNodes.forEach((l) => {
            if (l.icContext == context) l.remove();
        });
    }
}
customElements.define("ic-context-switcher", IcContextSwitcher);


class IcContextControl extends HTMLElement {
    constructor(context, type, name) {
        super();
        this.icContext = context;
        this.icContextControlType = type;
        this.icContextControlName = capitalizeString(name);
    }
    connectedCallback() {
        this.innerHTML = this.icContextControlName;
        this.classList.add("primed-control");
        this.addEventListener("click", icContextManager.controlClicked);
    }
}
customElements.define("ic-context-control", IcContextControl);


class IcContextForm extends HTMLElement {
    constructor() {
        super();
    }
    connectedCallback() {
        const form = document.createElement("form");
        const input = document.createElement("input");
        input.autofocus = true;
        input.placeholder = "New context";
        this.icInput = input;
        form.appendChild(input);
        const textarea = document.createElement("textarea");
        this.icTextarea = textarea;
        form.appendChild(textarea);
        const submit = document.createElement("button");
        submit.type = "submit";
        submit.innerHTML = "&check;";
        form.appendChild(submit);
        const cancel = document.createElement("button");
        cancel.type = "button";
        cancel.innerHTML = "&cross;";
        cancel.addEventListener("click", (event) => {
            event.stopPropagation();
            if (input.value.length == 0) {
                this.remove();
            }
            else {
                input.value = "";
            }
        });
        form.appendChild(cancel);
        form.addEventListener("submit", (event) => {
            event.preventDefault();
            icContextManager.createNewContext(this);
        });
        this.appendChild(form);
    }
}
customElements.define("ic-context-form", IcContextForm);


class IcContext extends HTMLElement {
    constructor() {
        super();
    }
    connectedCallback() {
        this.icContext = CONTEXT;
        this.icContextDescription = DESCRIPTION;
        this.mdConverter = new showdown.Converter({
            tables: true,
            tasklists: true
        });
        this.icSystems = new Object();
        const aiSystems = document.createElement("div");
        aiSystems.classList.add("systems");
        aiSystems.classList.add("ai-systems");
        this.appendChild(aiSystems);
        const dataSystems = document.createElement("div");
        dataSystems.classList.add("systems");
        dataSystems.classList.add("data-systems");
        this.appendChild(dataSystems);
        this.buildIcSystems();
    }
    async buildIcSystems() {
        const resource = `/api/systems?context=${CONTEXT}`;
        try {
            const response = await fetch(resource);
            if(!response.ok) {
                throw new Error(`HTTP error: ${response.status}`);
            }
            const json = await response.json();
            const systems = json.systems;
            for (const system of systems) {
                switch (system.name) {
                    case "conversations":
                        icContext.childNodes[0].appendChild(new IcSystem(system))
                        break;
                    default:
                        icContext.childNodes[1].appendChild(new IcSystem(system));
                }
            }
            icContext.childNodes.forEach((l) => {
                if (l.childElementCount == 0) l.remove();
            });
        } catch (error) {
            console.error(`Fetch problem: ${error.message}`);
        }
    }
}
customElements.define("ic-context", IcContext);


class IcSystem extends HTMLElement {
    
    constructor(system) {
        super();
        this.icName = system.name;
        this.icItemDisplay = null;
        this.icControlDisplay = null;
        this.icItems = new Array();
        this.icControls = new Array();
        this.icSelectedItem = null;
        this.icSelectedDetail = null;
        this.icForm = null;
        this.icSpinner = null;
    }

    connectedCallback() {
        
        icContext.icSystems[this.icName] = this;
        
        this.classList.add(this.icName);
        
        const heading = document.createElement('h2');
        heading.innerHTML = capitalizeString(this.icName);
        this.appendChild(heading);
        
        // this.appendChild(new IcItemDisplay(this));
        const icItemDisplay = document.createElement("div");
        icItemDisplay.classList.add("ic-item-display");
        this.icItemDisplay = icItemDisplay;
        this.appendChild(icItemDisplay);
        this.getItems();
        
        // this.appendChild(new IcControlDisplay(this));
        const icControlDisplay = document.createElement("div");
        icControlDisplay.classList.add("ic-control-display");
        this.icControlDisplay = icControlDisplay;
        this.appendChild(icControlDisplay);
        this.getControls();
        this.primeControls();
        this.styleControls();

        this.addEventListener("click", this.singleClick);
    }

    singleClick() {
        if (this.icSelectedDetail) {
            this.icSelectedDetail.dispatchEvent(new Event("click"));
            if (this.icSelectedItem) {
                this.icSelectedItem.dispatchEvent(new Event("click"));
            }
        }
        else {
            if (this.icSelectedItem) {
                this.icSelectedItem.dispatchEvent(new Event("click"));
            }
        }
    }

    async getItems() {
        const resource = `/api/items?context=${CONTEXT}&system=${this.icName}`;
        try {
            const response = await fetch(resource);
            if(!response.ok) {
                throw new Error(`HTTP error: ${response.status}`);
            }
            const json = await response.json();
            const items = json.items;
            for (const item of items) {
                this.icItemDisplay.appendChild(new IcItem(this, item));
            }    
        }
        catch (error) {
            console.error(`Fetch problem: ${error.message}`);
        }
    }

    getControls() {
        const specs = {
            "items": [
                {
                    "action": "update",
                    "symbol": "&#9998; Update",
                },
                {
                    "action": "create",
                    "symbol": "&#10022; Create",
                },
                {
                    "action": "import",
                    "symbol": "&#8687; Import",
                },
                {
                    "action": "export",
                    "symbol": "&#9112; Export",
                },
                {
                    "action": "nullify",
                    "symbol": "&#8856; Delete",
                },
                {
                    "action": "higher",
                    "symbol": "&uarr; Higher",
                },
                {
                    "action": "lower",
                    "symbol": "&darr; Lower",
                },
                {
                    "action": "top",
                    "symbol": "&#8607; Top",
                },
                {
                    "action": "bottom",
                    "symbol": "&#8609; Bottom",
                }
            ],
            "conversations": [
                {
                    "action": "update",
                    "symbol": "&#9998; Update",
                },
                {
                    "action": "create",
                    "symbol": "&#10022; Create",
                },
                {
                    "action": "nullify",
                    "symbol": "&#8856; Delete",
                }
            ]
        }
        const spec = specs[this.icName];
        for (const control of spec) {
            this.icControlDisplay.appendChild(new IcControl(this, control));
        }
    }

    primeControls() {
        
        for (const control of this.icControls) {
            control.icPrimed = false;
        }
        
        if (!this.icForm) {
            
            if (this.icSelectedItem) {
                
                if (this.icSelectedDetail) {
                    
                    if (["items"].includes(this.icName)) {

                        const prime = ["update", "nullify"];
                        for (const control of this.icControls) {
                            if (prime.includes(control.icAction)){
                                control.icPrimed = true;
                            }
                       }
                    }
                }
                else {
                    const n = this.icItems.length;
                    const rank = this.icSelectedItem.icRank;
                    const dontPrime = ["import", "export"];
                    if (n == 1) {
                        dontPrime.push("higher", "top", "lower", "bottom")
                    }
                    else if (rank == 1) {
                        dontPrime.push("higher", "top");
                    }
                    else if (n == rank) {
                        dontPrime.push("lower", "bottom");
                    }
                    for (const control of this.icControls) {
                        if (!dontPrime.includes(control.icAction)) {
                            control.icPrimed = true;
                        }
                    }
                }
            }
            else {
                const prime = ["create", "import", "export"];
                for (const control of this.icControls) {
                    if (prime.includes(control.icAction)){
                        control.icPrimed = true;
                    }
                }
            }
        }
    }

    styleControls() {
        for (const control of this.icControls) {
            if (control.icPrimed == true) {
                control.classList.add("primed-control");
            }
            else {
                control.classList.remove("primed-control");
            }
        }
    }

    removeForm() {
        this.icForm.remove();
        this.icForm = null;
        this.primeControls();
        this.styleControls();
    }
    
    updateDisplay(data, operation) {
        switch (operation) {
            case "createItem":
                if (["items", "conversations"].includes(this.icName)) {
                    const system = this;
                    const item = new Object();
                    item.id = null;
                    item.name = data.name;
                    item.rank = this.icItemDisplay.childElementCount + 1;
                    item.details = [];
                    this.icItemDisplay.appendChild(new IcItem(system, item));
                }
                break;
            case "importItems":
                // Nothing needed. The user already has a copy of the data locally so no need to provide protection from a sever failure.
                break;
            case "exportItems":
                // Nothing needed. The user just gets a csv file. Nothing changes.
                break;
            case "updateItem":
                if (["items", "conversations"].includes(this.icName)) {
                    this.icSelectedItem.updateSelf(data);
                }
                break;
            case "createDetail":
                this.icSelectedItem.createDetail(data);
                break;
            case "nullifyItem":
                if (["items", "conversations"].includes(this.icName)) {
                    for (const item of this.icItems) {
                        if (item.icRank > this.icSelectedItem.icRank) {
                            item.icRank = item.icRank - 1;
                        }
                    }
                    const nullifiedItem = this.icItemDisplay.removeChild(this.icSelectedItem);
                }
                break;
            case "higherItem":
                if (["items"].includes(this.icName)) {
                    const affectedItem = this.icItems.slice(this.icSelectedItem.icRank - 2, this.icSelectedItem.icRank - 1)[0];
                    this.icItems.splice(this.icSelectedItem.icRank - 2, 2, this.icSelectedItem, affectedItem);
                    this.icItemDisplay.insertBefore(this.icSelectedItem, affectedItem);
                    this.fixItemRanks();                    
                }
                break;
            case "lowerItem":
                if (["items"].includes(this.icName)) {
                    const lowerItem = this.icItems[this.icSelectedItem.icRank];
                    const newLowerItem = this.icItems[this.icSelectedItem.icRank + 1]
                    this.icItems.splice(this.icSelectedItem.icRank - 1, 2, lowerItem, this.icSelectedItem);
                    this.icItemDisplay.insertBefore(this.icSelectedItem, newLowerItem)
                    this.fixItemRanks();
                }
                break;
            case "topItem":
                if (["items"].includes(this.icName)) {
                    this.icItemDisplay.insertBefore(this.icSelectedItem, this.icItems[0]);
                    for (let i = 0; i < this.icItemDisplay.childElementCount; i++) {
                        this.icItems[i] = this.icItemDisplay.childNodes[i];
                    }
                    this.fixItemRanks();
                }
                break;
            case "bottomItem":
                if (["items"].includes(this.icName)) {
                    // Update the DOM
                    this.icItemDisplay.appendChild(this.icSelectedItem);
                    // Update this.icItems
                    for (let i = 0; i < this.icItemDisplay.childElementCount; i++) {
                        this.icItems[i] = this.icItemDisplay.childNodes[i];
                    }
                    this.fixItemRanks();
                }
                break;
            case "updateDetail": {
                if (["items"].includes(this.icName)) {
                    this.icSelectedDetail.updateSelf(data);
                }
                break;
            }
            case "nullifyDetail":
                if (["items"].includes(this.icName)) {
                    this.icSelectedDetail.remove();
                }
                for (const detail of this.icSelectedItem.icDetails) {
                    if (detail.icRank > this.icSelectedDetail.icRank) {
                        detail.icRank = detail.icRank - 1;
                    }
                }
                break;
            default:
                console.error("Unexpected switch statement fallthrough");
        }
    }

    fixItemRanks() {
        for (let i = 0; i < this.icItems.length; i++) {
            this.icItems[i].icRank = i + 1;
        }
    }
    
    async requestOperation(payload) {
        // Update front end with user input.
        const resource = "api/operations";
        const options = {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        }
        try {
            const response = await fetch(resource, options);
            if(!response.ok) {

                this.revertDisplayUpdate(payload.data, payload.operation);
                
                if (this.icForm) this.removeForm();
                
                this.primeControls();
                this.styleControls();
                
                throw new Error(`HTTP error: ${response.status}`);
            }
            const json = await response.json();
            this.processResponse(payload.operation, json.response);
        }
        catch (error) {
            console.error(`Fetch problem: ${error.message}`);
        }
    }

    processResponse(operation, data) {
        // Confirmatory actions following a successful database operation.
        switch (operation) {

            case "createItem":
                if (["items", "conversations"].includes(this.icName)) {
                    const len = this.icItems.length;
                    this.icItems[len - 1].icId = data.id;
                }
                break;
            case "importItems":
                for (const item of data.items) {
                    this.icItemDisplay.appendChild(new IcItem(this, item));
                }
                break;
            case "exportItems": {
                let csvString = "";
                
                for (const item of this.icItems) {    
                    csvString += `"${item.icName}",`;
                    item.icDetails.forEach((l) => {
                        csvString += `"${l.content}",`;
                    });
                    csvString = csvString.substring(0, csvString.length - 1);
                    csvString += "\n";
                }
                const options = {
                    type: "text/csv",
                    endings: "transparent"
                };
                
                const csvFile = new File([csvString], `${data.name}.csv`, options);
                const url = URL.createObjectURL(csvFile);
                
                const link = document.createElement("a");
                link.href = url;
                link.download = csvFile.name;
                
                link.dispatchEvent(new MouseEvent("click"));
            }
                break;
            case "updateItem":
                // Nothing needed.
                break;
            case "createDetail":
                if (["conversations"].includes(this.icName)) {
                    this.icSelectedItem.createMessage(data);
                }
                break;
            case "nullifyItem":
                const nullifiedItem = this.icItems.splice(this.icSelectedItem.icRank - 1, 1);
                this.icSelectedItem = null;
                this.icSelectedDetail = null;
                break;
            case "higherItem":
                // Nothing needed.
                break;
            case "lowerItem":
                // Nothing needed.
                break;
            case "topItem":
                // Nothing needed.
                break;
            case "bottomItem":
                // Nothing needed.
                break;
            case "updateDetail":
                // Nothing needed.
                break;
            case "nullifyDetail":
                const nullifiedDetail = this.icSelectedItem.icDetails.splice(data.rank - 1, 1);
                this.icSelectedDetail = null;
            break;
            default:
                console.error("unexpected switch statement fall-through");
        }
        if (this.icForm) this.removeForm();
        this.primeControls();
        this.styleControls();
    }

    revertDisplayUpdate(data, operation) {
        switch (operation) {
            case "createItem":
                if (["items", "conversations"].includes(this.icName)) {
                    const len = this.icItems.length;
                    this.icItems[len - 1].remove();
                    const l = this.icItems.pop();
                }
                break;
            case "importItems":
                if (["items"].includes(this.icName)) {
                    // Nothing needed but an alert would be nice.
                }
                break;
            case "exportItems":
                if (["items"].includes(this.icName)) {
                    // Nothing needed but a alert would be nice.
                }
                break;
            case "updateItem":
                data.name = data.oldName;
                if (["items", "conversations"].includes(this.icName)) {
                    this.icSelectedItem.updateSelf(data);
                }
                break;
            case "createDetail":
                if (["items", "conversations"].includes(this.icName)) {
                    const len = this.icSelectedItem.icDetails.length;
                    this.icSelectedItem.icDetailDisplay.childNodes[len - 1].remove();
                    const l = this.icSelectedItem.icDetails.pop();
                }
                break;
            case "nullifyItem":
                // reappend the selected item to the display.
                const rank = this.icSelectedItem.icRank;
                if (rank == this.icItems.length) {
                    this.icItemDisplay.appendChild(this.icSelectedItem);
                }
                else {
                    this.icItemDisplay.insertBefore(this.icSelectedItem, this.icItems[rank]);
                    // change the ranks back
                    for (const item of this.icItems) {
                        if (item.icRank >= rank) {
                            item.icRank = item.icRank + 1;
                        }
                    }
                    this.icSelectedItem.icRank = rank;
                }
                break;
            case "higherItem": {
                // move the selected item back in this.icItems
                const higherItem = this.icItems[this.icSelectedItem.icRank];
                this.icItems.splice(this.icSelectedItem.icRank - 1, 2, higherItem, this.icSelectedItem);
                // move the selected item back in the dom
                const lowerItem = this.icItems[this.icSelectedItem.icRank + 1];
                this.icItemDisplay.insertBefore(this.icSelectedItem, lowerItem);                
                this.fixItemRanks();
                break;
            }
            case "lowerItem": {
                // move the selected item back in this.icItems
                const higherItem = this.icItems[this.icSelectedItem.icRank - 2];
                this.icItems.splice(this.icSelectedItem.icRank - 2, 2, this.icSelectedItem, higherItem);
                this.icItemDisplay.insertBefore(this.icSelectedItem, higherItem);
                this.fixItemRanks();
                break;
            }
            case "topItem": {
                const oldRank = data.oldRank;
                if (oldRank == this.icItems.length) {
                    this.icItemDisplay.appendChild(this.icSelectedItem);
                }
                else {
                    this.icItemDisplay.insertBefore(this.icSelectedItem, this.icItems[oldRank + 1]);
                }

                for (let i = 0; i < this.icItemDisplay.childElementCount; i++) {
                    this.icItems[i] = this.icItemDisplay.childNodes[i];
                }

                this.fixItemRanks();
                break;
            }
            case "bottomItem": {
                const oldRank = data.oldRank;
                if (oldRank == 1) {
                    this.icItemDisplay.prepend(this.icSelectedItem);
                }
                else {
                    this.icItemDisplay.insertBefore(this.icSelectedItem, this.icItems[oldRank - 1]);
                }

                for (let i = 0; i < this.icItemDisplay.childElementCount; i++) {
                    this.icItems[i] = this.icItemDisplay.childNodes[i];
                }

                this.fixItemRanks();
                break;
            }
            case "updateDetail":
                data.content = data.oldContent;
                if (["items"].includes(this.icName)) {
                    this.icSelectedDetail.updateSelf(data);
                }
                break;
            case "nullifyDetail":
                // reappend the selected item to the display.
                if (data.rank == this.icSelectedItem.icDetails.length) {
                    this.icSelectedItem.icDetailDisplay.appendChild(this.icSelectedDetail);
                }
                else {
                    this.icSelectedItem.icDetailDisplay.insertBefore(this.icSelectedDetail, this.icSelectedItem.icDetailDisplay.childNodes[data.rank - 1]);
                    // change the ranks back
                    for (const detail of this.icSelectedItem.icDetails) {
                        if (detail.icRank >= data.rank) {
                            detail.icRank = detail.icRank + 1;
                        }
                    }
                    this.icSelectedDetail.icRank = parseInt(data.rank);
                }
                break;
            default:
                console.error("Unexpected switch case fallthrough");
        }
    }
}
customElements.define("ic-system", IcSystem);


class IcItem extends HTMLElement {
    
    constructor(system, item) {
        super();
        this.icSystem = system;
        this.icId = item.id;
        this.icName = item.name;
        this.icRank = item.rank;
        this.icDetails = item.details;
        this.icDetailDisplay = null;
        this.nameContainer = null;
    }    
    
    connectedCallback() {

        if (this.icSystem.icSelectedItem != this) {
            
            this.icSystem.icItems.push(this);
            
            const nameContainer = document.createElement("div");
            this.nameContainer = nameContainer;
            nameContainer.classList.add("name");
            nameContainer.innerHTML = icContext.mdConverter.makeHtml(this.icName);
            this.appendChild(nameContainer);
            
            const icDetailDisplay = document.createElement("div");
            icDetailDisplay.classList.add("hidden");
            icDetailDisplay.classList.add("ic-detail-display");
            this.icDetailDisplay = icDetailDisplay;
    
            this.appendChild(icDetailDisplay);
            
            this.getDetails();
    
            this.addEventListener("click", this.singleClicked);
            this.addEventListener("dblclick", this.doubleClicked);
        }
    }

    getDetails() {

        for (const detail of this.icDetails) {
            this.icDetailDisplay.appendChild(new IcDetail(detail, this.icSystem));
        }
    }
    
    singleClicked(event) {

        event.stopPropagation();

        if (event.ctrlKey) {
            this.ctrlClicked();
        }
        else {
            const selectedItem = this.icSystem.icSelectedItem;
            const icForm = this.icSystem.icForm;
            const selectedDetail = this.icSystem.icSelectedDetail;

            if (!icForm && !selectedDetail && selectedItem == this || !selectedItem) {
                
                const selectedItem = this.icSystem.icSelectedItem;
                
                if (!selectedItem) {
                    this.icSystem.icSelectedItem = this;
                }
                else {
                    this.icSystem.icSelectedItem = null;
                }
                
                this.classList.toggle("selected-item");
                
            }
            this.icSystem.primeControls();
            this.icSystem.styleControls();
        }

    }

    ctrlClicked(event) {

        this.classList.toggle("showing-details");
        this.icDetailDisplay.classList.toggle("hidden");
        if (this.icSystem.icSelectedItem && this.icSystem.icSelectedItem != this) this.dispatchEvent(new Event("click"));
    }

    doubleClicked(event) {
        this.ctrlClicked();
        if (!this.icSystem.icSelectedItem) this.dispatchEvent(new Event("click"));
    }
    
    updateSelf(data) {

        this.icName = data.name;
        this.nameContainer.innerHTML = icContext.mdConverter.makeHtml(data.name);
    }
    
    createDetail(data) {

        data.role = 'user';
        data.rank = this.icDetails.length + 1;
        this.icDetails.push(data);
        this.icDetailDisplay.appendChild(new IcDetail(data, this.icSystem));
    }

    createMessage(data) {
        data.role = 'assistant';
        data.rank = this.icDetails.length + 1;
        this.icDetails.push(data);
        this.icDetailDisplay.appendChild(new IcDetail(data, this.icSystem));
    }
}    
customElements.define("ic-item", IcItem);


class IcDetail extends HTMLElement {
    constructor(detail, system) {
        super();
        this.icRole = detail.role;
        this.icContent = detail.content;
        this.icRank = detail.rank;
        this.icSystem = system;
    }
    
    connectedCallback() {
        
        const roleClass = `${this.icRole}-role`;
        this.classList.add(roleClass);
        
        this.innerHTML = icContext.mdConverter.makeHtml(this.icContent);
        
        this.addEventListener("click", this.detailClicked);

    }

    detailClicked(event) {
        
        event.stopPropagation();

        if (["items"].includes(this.icSystem.icName)) {

            const item = this.parentElement.parentElement;
            
            const selectedDetail = this.icSystem.icSelectedDetail;
    
            const selectedItem = this.icSystem.icSelectedItem;
            
            const icForm = this.icSystem.icForm;
            
            if (!icForm && selectedItem == item) {
                
                if (!selectedDetail) {
                    this.icSystem.icSelectedDetail = this;
                }          
                else if (selectedDetail == this) {
                    this.icSystem.icSelectedDetail = null;
                }
                else {
                    selectedDetail.classList.toggle("selected-detail");
                    this.icSystem.icSelectedDetail = this;
                    
                }
    
                this.classList.toggle("selected-detail");
                
                this.icSystem.primeControls();
                
                this.icSystem.styleControls();
            }
        }

    }

    updateSelf(data) {

        this.icContent = data.content;
        this.innerHTML = icContext.mdConverter.makeHtml(data.content);
    }
}
customElements.define("ic-detail", IcDetail);


class IcControl extends HTMLElement {
    constructor(system, spec) {
        super();
        this.icAction = spec.action;
        this.icSymbol = spec.symbol;
        this.icAutosubmit = spec.autosubmit;
        this.icPrimed = false;
        this.icSystem = system;
    }
    connectedCallback() {
        this.icSystem.icControls.push(this);
        this.innerHTML = this.icSymbol;
        this.addEventListener("click", this.controlClicked);
    }
    controlClicked() {
        if (this.icPrimed) {
            this.icSystem.icControlDisplay.appendChild(new IcForm(this.icAction, this.icSystem));
            const input = this.icSystem.querySelector("input")
            if (input && input.type != "hidden") {
                input.focus();
            }
            else {
                const textarea = this.icSystem.querySelector("textarea");
                if (textarea) textarea.focus();
            }
        }
        this.icSystem.primeControls();
        this.icSystem.styleControls();
    }
}
customElements.define("ic-control", IcControl);


class IcForm extends HTMLElement {
    
    constructor(action, system) {
        super();
        this.icAction = action;
        this.icSystem = system;
    }

    connectedCallback() {
        
        this.icSystem.icForm = this;
        
        this.icOperation = this.getOperation();

        const form = document.createElement("form");

        // Operations which will wait for user to submit, visible fields or not.
        if (["createItem", "importItems", "exportItems", "updateItem", "createDetail", "nullifyItem", "updateDetail", "nullifyDetail"].includes(this.icOperation)) {
            // Add heading/label to form
            const formInfoText = document.createElement("h3");
            formInfoText.innerHTML = this.formInfoText();
            form.appendChild(formInfoText);
        }
        
        // Add form fields (applies to all operations)
        const formFieldSpecs = this.formFieldSpecs();
        const formFields = this.formFields(formFieldSpecs);// Generated same way for all operations.
        form.appendChild(formFields);
        
        // Operations which wait for user to submit.
        if (["createItem", "importItems", "exportItems", "updateItem", "createDetail", "nullifyItem", "updateDetail", "nullifyDetail"].includes(this.icOperation)) {
            const formControls = this.formControls(); // Generate the same way for all operations.
            form.appendChild(formControls);
        }
        
        form.addEventListener("submit", (event) => {
            event.preventDefault();
            new FormData(form);
        });

        form.addEventListener("formdata", (event) => {
            
            form.classList.add("ghost");
            
            this.appendChild(new IcSpinner(this.icSystem));
            
            const payload = new Object();
            
            payload["operation"] = this.icOperation;
            payload["system"] = this.icSystem.icName;
            payload["context"] = CONTEXT;
            
            payload["data"] = new Object();
            
            for (const entry of event.formData.entries()) {
                payload["data"][entry[0]] = entry[1];
            }
            
            // Handle operations which involve importing csv files.
            if (["importItems"].includes(this.icOperation)) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    payload["data"]["csvString"] = e.target.result;
                    const valid = this.validateRequest(payload); // You can test payloads from the browser console!
                    if (!valid) {
                        alert("invalid request.");
                        this.icSystem.removeForm();
                    }
                    else {
                        this.icSystem.updateDisplay(payload.data, payload.operation);
                        this.icSystem.requestOperation(payload);
                    }
                }
                const file = payload.data.csvFile;
                payload.data.csvName = file.name;
                reader.readAsText(file);
                delete payload.data.csvFile;
            }
            // Handle operations which don't involve importing csv files.
            else {
                const valid = this.validateRequest(payload);// You can test payloads from the browser console!
                if (!valid) {
                    alert("invalid request.");
                    this.icSystem.removeForm();
                }
                else {
                    this.icSystem.updateDisplay(payload.data, payload.operation);
                    this.icSystem.requestOperation(payload);
                }
            }
        });
        
        this.appendChild(form);

        // Autosubmit for certain operations
        if (["nullifyItems", "higherItem", "lowerItem", "topItem", "bottomItem"].includes(this.icOperation)) new FormData(form);

    }
    getOperation() {
        if (this.icSystem.icSelectedDetail) {

                switch (this.icAction) {
                    case "update":
                        return "updateDetail";
                        break;
                    case "nullify":
                        return "nullifyDetail";
                        break;
                    default:
                        console.error("Unexpected switch statement fall-through.");
                }
            }
        else if (this.icSystem.icSelectedItem) {
            switch (this.icAction) {
                case "update":
                    return "updateItem";
                    break;
                case "create":
                    return "createDetail";
                    break;
                case "nullify":
                    return "nullifyItem";
                    break;
                case "higher":
                    return "higherItem";
                    break;
                case "lower":
                    return "lowerItem";
                    break;
                case "top":
                    return "topItem";
                    break;
                case "bottom":
                    return "bottomItem";
                    break;
                default:
                    console.error("Unexpected switch statement fall-through.");
            }
        }
        else { // Could be create, import, or export at the moment.
            switch (this.icAction) {
                case "create": {
                    return "createItem";
                    break;
                }
                case "import": {
                    return "importItems"
                    break;
                }
                case "export":
                    return "exportItems";
                    break
                default: {
                    console.error("Unexpected switch statement fall-through.");
                }
            }
        }
    }
    formInfoText() {
        const infoTexts = {
            "createItem": {
                "items": "You're creating an item.",
                "conversations": "You're creating a conversation."
            },
            "importItems": {
                "items": "You're importing items."
            },
            "exportItems": {
                "items": "You're exporting items."
            },
            "updateItem": {
                "items": "You're updating an item.",
                "conversations": "You're updating a conversation."
            },
            "createDetail": {
                "items": "You're creating a detail.",
                "conversations": "You're creating a message."
            },
            "nullifyItem": {
                "items": "You're deleting an item.",
                "conversations": "Are you sure you want to delete this conversation?"
            },
            "updateDetail": {
                "items": "You're updating a detail.",
                "conversations": "Do not proceed."
            },
            "nullifyDetail": {
                "items": "You're deleting an detail.",
                "conversations": "Do not proceed."
            }
        }
        const infoText = infoTexts[this.icOperation][this.icSystem.icName];
        if (infoText) {
            return infoText;
        } 
        else  {
            console.error("Missing configuration: formInfoText.")
            return "Missing configuration: formInfoText"
        }
    }
    formFieldSpecs() {
        const specs = new Array();
        switch (this.icOperation) {
            case "createItem": {
                switch (this.icSystem.icName) {
                    case "items": {
                        specs.push(new Array());
                        const id = `${this.icSystem.icName}-${specs[0].length}`;
                        specs[0].push({
                            "element": "input",
                            "attributes": {
                                "id": id,
                                "type": "text",
                                "label": "Name",
                                "name": "name"
                            }
                        });
                        break;
                    }
                    case "conversations": {
                        specs.push(new Array());
                        const id = `${this.icSystem.icName}-${specs[0].length}`;
                        specs[0].push({
                            "element": "input",
                            "attributes": {
                                "id": id,
                                "type": "text",
                                "label": "Name",
                                "name": "name"
                            }
                        });
                        break;
                    }
                    default:
                        console.error("Unexpected switch statement fall-through");
                }
                break;
            }
            case "importItems": {
                switch (this.icSystem.icName) {
                    case "items":
                        specs.push(new Array());
                        const id = `${this.icSystem.icName}-${specs[0].length}`;
                        specs[0].push({
                            "element": "input",
                            "attributes": {
                                "id": id,
                                "type": "file",
                                "label": "CSV file",
                                "name": "csvFile"
                            }
                        });
                        break;
                    default:
                        console.error("Unexpected switch statement fall-through");
                }
                break;
            }
            case "exportItems": {
                switch (this.icSystem.icName) {
                    case "items":
                        specs.push(new Array());
                        const id = `${this.icSystem.icName}-${specs[0].length}`;
                        specs[0].push({
                            "element": "input",
                            "attributes": {
                                "id": id,
                                "type": "text",
                                "label": "File name",
                                "name": "name",
                                "value": icContextOwner.makeFilename()
                            }
                        });
                        break;
                    default:
                        console.error("Unexpected switch statement fall-through");
                }
                break;
            }
            case "updateItem": {
                switch (this.icSystem.icName) {
                    case "items": {
                        specs.push(new Array());
                        let id = `${this.icSystem.icName}-${specs[0].length}`;
                        specs[0].push({
                            "element": "input",
                            "attributes": {
                                "id": id,
                                "type": "text",
                                "label": "Name",
                                "name": "name",
                                "value": this.icSystem.icSelectedItem.icName
                            }
                        });
                        id = `${this.icSystem.icName}-${specs[0].length}`;
                        specs[0].push({
                            "element": "input",
                            "attributes": {
                                "id": id,
                                "type": "hidden",
                                "name": "id",
                                "value": this.icSystem.icSelectedItem.icId
                            }
                        })
                        id = `${this.icSystem.icName}-${specs[0].length}`;
                        specs[0].push({
                            "element": "input",
                            "attributes": {
                                "id": id,
                                "type": "hidden",
                                "name": "oldName",
                                "value": this.icSystem.icSelectedItem.icName
                            }
                        })
                        break;
                    }
                    case "conversations": {
                        specs.push(new Array());
                        let id = `${this.icSystem.icName}-${specs[0].length}`;
                        specs[0].push({
                            "element": "input",
                            "attributes": {
                                "id": id,
                                "type": "text",
                                "label": "Name",
                                "name": "name",
                                "value": this.icSystem.icSelectedItem.icName
                            }
                        });
                        id = `${this.icSystem.icName}-${specs[0].length}`;
                        specs[0].push({
                            "element": "input",
                            "attributes": {
                                "id": id,
                                "type": "hidden",
                                "name": "id",
                                "value": this.icSystem.icSelectedItem.icId
                            }
                        })
                        id = `${this.icSystem.icName}-${specs[0].length}`;
                        specs[0].push({
                            "element": "input",
                            "attributes": {
                                "id": id,
                                "type": "hidden",
                                "name": "oldName",
                                "value": this.icSystem.icSelectedItem.icName
                            }
                        })
                        break;
                    }
                    default:
                        console.error("Unexpected switch statement fall-through.");
                }
                break;
            }
            case "createDetail": {
                switch (this.icSystem.icName) {
                    case "items": {
                        specs.push(new Array());
                        const id = `${this.icSystem.icName}-${specs[0].length}`;
                        specs[0].push({
                            "element": "textarea",
                            "attributes": {
                                "id": id,
                                "label": "Content",
                                "name": "content",
                                "type": "textarea" // Needed for the class attribute.
                            }
                        });
                        specs[0].push({
                            "element": "input",
                            "attributes": {
                                "type": "hidden",
                                "name": "id",
                                "value": this.icSystem.icSelectedItem.icId
                            }
                        });
                        break;
                    }
                    case "conversations": {
                        specs.push(new Array());
                        const id = `${this.icSystem.icName}-${specs[0].length}`;
                        specs[0].push({
                            "element": "textarea",
                            "attributes": {
                                "id": id,
                                "label": "Message",
                                "name": "content",
                                "type": "textarea" // Needed for the class attribute.
                            }
                        });
                        specs[0].push({
                            "element": "input",
                            "attributes": {
                                "type": "hidden",
                                "name": "id",
                                "value": this.icSystem.icSelectedItem.icId
                            }
                        });
                        break;
                    }
                    default:
                        console.error("Unexpected switch statement fall-through.");
                }
                break;
            }
            case "nullifyItem": {
                switch (this.icSystem.icName) {
                    case "items": {
                        specs.push(new Array());
                        specs[0].push({
                            "element": "input",
                            "attributes": {
                                "type": "hidden",
                                "name": "id",
                                "value": this.icSystem.icSelectedItem.icId
                            }
                        });
                        break;
                    }
                    case "conversations": {
                        specs.push(new Array());
                        specs[0].push({
                            "element": "input",
                            "attributes": {
                                "type": "hidden",
                                "name": "id",
                                "value": this.icSystem.icSelectedItem.icId
                            }
                        });
                        break;
                    }
                    default:
                        console.error("Unexpected switch statement fall-through.");
                    }
                break;
            }
            case "higherItem": {
                switch (this.icSystem.icName) {
                    case "items":
                        specs.push(new Array());
                        specs[0].push({
                            "element": "input",
                            "attributes": {
                                "type": "hidden",
                                "name": "id",
                                "value": this.icSystem.icSelectedItem.icId
                            }
                        });
                        break;
                    default:
                        console.error("Unexpected switch statement fall-through.");
                }
                break;
            }
            case "lowerItem": {
                switch (this.icSystem.icName) {
                    case "items":
                        specs.push(new Array());
                        specs[0].push({
                            "element": "input",
                            "attributes": {
                                "type": "hidden",
                                "name": "id",
                                "value": this.icSystem.icSelectedItem.icId
                            }
                        });
                        break;
                    default:
                        console.error("Unexpected switch statement fall-through.");
                }
                break;
            }
            case "topItem": {
                switch (this.icSystem.icName) {
                    case "items":
                        specs.push(new Array());
                        specs[0].push({
                            "element": "input",
                            "attributes": {
                                "type": "hidden",
                                "name": "id",
                                "value": this.icSystem.icSelectedItem.icId
                            }
                        });
                        specs[0].push({
                            "element": "input",
                            "attributes": {
                                "type": "hidden",
                                "name": "oldRank",
                                "value": this.icSystem.icSelectedItem.icRank
                            }
                        })
                        break;
                    default:
                        console.error("Unexpected switch statement fall-through.");
                }
                break;
            }
            case "bottomItem": {
                switch (this.icSystem.icName) {
                    case "items":
                        specs.push(new Array());
                        specs[0].push({
                            "element": "input",
                            "attributes": {
                                "type": "hidden",
                                "name": "id",
                                "value": this.icSystem.icSelectedItem.icId
                            }
                        });
                        specs[0].push({
                            "element": "input",
                            "attributes": {
                                "type": "hidden",
                                "name": "oldRank",
                                "value": this.icSystem.icSelectedItem.icRank
                            }
                        })
                        break;
                    default:
                        console.error("Unexpected switch statement fall-through.");
                }
                break;
            }
            case "updateDetail": {
                switch (this.icSystem.icName) {
                    case "items": {
                        specs.push(new Array());
                        const id = `${this.icSystem.icName}-${specs[0].length}`;
                        specs[0].push({
                            "element": "textarea",
                            "attributes": {
                                "id": id,
                                "type": "text",
                                "label": "Content",
                                "name": "content",
                                "value": this.icSystem.icSelectedDetail.icContent
                            }
                        });
                        specs[0].push({
                            "element": "input",
                            "attributes": {
                                "type": "hidden",
                                "name": "oldContent",
                                "value": this.icSystem.icSelectedDetail.icContent
                            }
                        });
                        specs[0].push({
                            "element": "input",
                            "attributes": {
                                "type": "hidden",
                                "name": "id",
                                "value": this.icSystem.icSelectedItem.icId,
                            }
                        });
                        specs[0].push({
                            "element": "input",
                            "attributes": {
                                "type": "hidden",
                                "name": "rank",
                                "value": this.icSystem.icSelectedDetail.icRank,
                            }
                        });
                        break;
                    }
                    case "conversations":
                        break;
                    default:
                        console.error("Unexpected switch statement fall-through.");
                }
                break;
            }
            case "nullifyDetail": {
                switch (this.icSystem.icName) {
                    case "items": {
                        specs.push(new Array());
                        specs[0].push({
                            "element": "input",
                            "attributes": {
                                "type": "hidden",
                                "name": "rank",
                                "value": this.icSystem.icSelectedDetail.icRank,
                            }
                        });
                        specs[0].push({
                            "element": "input",
                            "attributes": {
                                "type": "hidden",
                                "name": "id",
                                "value": this.icSystem.icSelectedItem.icId,
                            }
                        });
                        break;
                    }
                    case "conversations":
                        break;
                    default:
                        console.error("Unexpected switch statement fall-through.");
                }
                break;
            }
            default:
                console.error("Unexpected switch statement fall-through.");
        }
        return specs;
    }

    formFields(specs) {
        const fields = document.createElement("div");
        fields.classList.add("form-fields");
        for (const section of specs) {
            const fieldSection = document.createElement("div");
            fieldSection.classList.add("field-section");
            if (section.label) {
                const sectionHeading = document.createElement("h4");
                sectionHeading.innerHTML = section.label;
                fieldSection.appendChild(sectionHeading);
            }
            for (const fieldSpec of section) {
                const field = document.createElement("div");
                field.classList.add("field");
                field.classList.add(`${fieldSpec.attributes.type}-field`);
                if (fieldSpec.attributes.label) {
                    const label = document.createElement("label");
                    label.setAttribute("for", fieldSpec.attributes.id);
                    label.innerHTML = fieldSpec.attributes.label;
                    field.appendChild(label);
                }
                const input = document.createElement(fieldSpec.element);
                if (fieldSpec.element != "textarea") input.type = fieldSpec.attributes.type;
                if (fieldSpec.attributes.id) input.id = fieldSpec.attributes.id;
                input.name = fieldSpec.attributes.name;
                if (fieldSpec.attributes.value) input.value = fieldSpec.attributes.value;
                field.appendChild(input);
                fieldSection.appendChild(field);
            }
            fields.appendChild(fieldSection);
        }
        return fields;
    }

    formControls() {
        const specs = new Array();
        specs.push({
            "element": "button",
            "attributes": {
                "type": "submit",
                "label": "&check;",
                "name": "submit"
            }
        });
        specs.push({
            "element": "button",
            "attributes": {
                "type": "button",
                "label": "&cross;",
                "name": "cancel"
            }
        });
        const controls = document.createElement("div");
        controls.classList.add("form-controls");
        for (const control of specs) {
            const input = document.createElement(control.element);
            input.type = control.attributes.type;
            input.innerHTML = control.attributes.label;
            input.icSystem = this.icSystem;
            controls.appendChild(input);
            if (control.attributes.name == "cancel") input.addEventListener("click", () => {
                this.icSystem.removeForm();
            });
        }
        return controls;
    }

    validateRequest(payload) {
        if (!payload.context || !payload.data || !payload.operation || !payload.system) return false;
        switch (payload.operation) {
            case "createItem":
                if (payload.data.name) return true;
                break;
            case "importItems":
                if (payload.data.csvString) return true;
                break;
            case "exportItems":
                if (payload.data.name) return true;
                break;
            case "updateItem":
                if (payload.data.name && payload.data.id && payload.data.oldName) return true;
                break;
            case "createDetail":
                if (payload.data.content) return true;
                break;
            case "nullifyItem":
                if (payload.data.id) return true;
                break;
            case "higherItem":
                if (payload.data.id) return true;
                break;
            case "lowerItem":
                if (payload.data.id) return true;
                break;
            case "topItem":
                if (payload.data.id) return true;
                break;
            case "bottomItem":
                if (payload.data.id) return true;
                break;
            case "updateDetail":
                if (payload.data.content && payload.data.id && payload.data.oldContent && payload.data.rank) return true;
                break;
            case "nullifyDetail":
                if (payload.data.rank) return true;
                break;
            default:
                return false;
        }
    }

    disconnectedCallback() {
        this.icSystem.icForm = null;
    }
}
customElements.define("ic-form", IcForm);


class IcSpinner extends HTMLElement {
    constructor(system) {
        super();
        this.icSystem = system;
    }
    connectedCallback() {
        this.icSystem.icSpinner = this;
        const bar = document.createElement("div");
        bar.classList.add("spinner");
        this.appendChild(bar);
    }
    disconnectedCallback() {
        this.icSystem.icSpinner = null;
    }
}
customElements.define("ic-spinner", IcSpinner);


main();
