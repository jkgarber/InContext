function main() {
    document.body.appendChild(new RegisterHeading);
    document.body.appendChild(new RegisterForm);
    document.body.appendChild(new LoginLink);
}

class RegisterHeading extends HTMLElement {
    constructor() {
        super();
    }
    connectedCallback() {
        const heading = document.createElement("h1");
        heading.innerHTML = "InContext"
        this.appendChild(heading)
        const introText = document.createElement("p");
        introText.innerHTML = "Register here."
        this.appendChild(introText);
    }
}
customElements.define("register-heading", RegisterHeading);

class RegisterForm extends HTMLElement {
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
        usernameInput.placeholder = "Set your username";
        passwordInput.placeholder = "Set your password";
        const confirmationInput = document.createElement("input");
        confirmationInput.name = "confirmation";
        confirmationInput.type = "password";
        confirmationInput.placeholder = "Confirm your password";
        form.appendChild(confirmationInput);
        const submitButton = document.createElement("button");
        submitButton.type = "submit";
        submitButton.innerHTML = "Register";
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
    }

    async sendRequest(payload) {

        const resource = "register";
        
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
customElements.define("register-form", RegisterForm);

class LoginLink extends HTMLElement {
    constructor() {
        super();
    }
    connectedCallback() {
        const link = document.createElement("a");
        link.href = "/login";
        link.innerHTML = "Existing User";
        this.appendChild(link);
    }
}
customElements.define("login-link", LoginLink);

main();