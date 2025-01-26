function main() {
    document.body.appendChild(new LoginHeading);
    document.body.appendChild(new LoginForm);
    document.body.appendChild(new RegisterLink);
}

class LoginHeading extends HTMLElement {
    constructor() {
        super();
    }
    connectedCallback() {
        const heading = document.createElement("h1");
        heading.innerHTML = "InContext"
        this.appendChild(heading)
        const introText = document.createElement("p");
        introText.innerHTML = "Please log in."
        this.appendChild(introText);
    }
}
customElements.define("login-heading", LoginHeading);

class LoginForm extends HTMLElement {
    constructor() {
        super();
    }
    connectedCallback() {
        const form = document.createElement("form");
        const usernameInput = document.createElement("input");
        form.appendChild(usernameInput);
        const passwordInput = document.createElement("input");
        passwordInput.type = "password";
        form.appendChild(passwordInput);
        usernameInput.type = "text";
        usernameInput.placeholder = "Username";
        passwordInput.placeholder = "Password";
        const submitButton = document.createElement("button");
        submitButton.type = "submit";
        submitButton.innerHTML = "Log in";
        form.appendChild(submitButton);
        usernameInput.name = "username";
        passwordInput.name = "password";
        
        form.addEventListener("submit", (event) => {
            event.preventDefault();
            new FormData(form);
        });
        
        form.addEventListener("formdata", (event) => {
            
            // form.classList.add("ghost");
            
            // this.appendChild(new IcOverviewSpinner(this.icOverview));
            
            const payload = new Object();
            for (const entry of event.formData.entries()) {
                payload[entry[0]] = entry[1];
            }
            if (payload.username && payload.password) { // Data validation
                this.sendRequest(payload);
            }
            else {
                alert("invalid request.");
            }
        });
        this.appendChild(form);
        document.querySelector("input").focus();
    }

    async sendRequest(payload) {

        const resource = "login";
        
        const options = {
            
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        }
        
        try {
            const response = await fetch(resource, options);
            
            if (!response.ok) {
        
                throw new Error(`HTTP error: ${response.status}`);
            }
            
            window.location = "/";
        }
        catch (error) {
            
            console.error(`Fetch problem: ${error.message}`);
        }
            
    }
}
customElements.define("login-form", LoginForm);

class RegisterLink extends HTMLElement {
    constructor() {
        super();
    }
    connectedCallback() {
        const link = document.createElement("a");
        link.href = "/register";
        link.innerHTML = "New User";
        this.appendChild(link);
    }
}
customElements.define("register-link", RegisterLink);

main();