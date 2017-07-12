export module UserManagement {
  export class Login {
    remoteDb: any;
    constructor(remote: any) {
        this.remoteDb = remote;
    }
    signupUser(): void {
        let usernameInput: any = document.getElementById('signup-username');
        let passwordInput: any = document.getElementById('signup-password');
        let username = (<HTMLInputElement>document.getElementById('signup-username')).value;
        let password = passwordInput.value;
        usernameInput.value = '';
        passwordInput.value = '';
        this.remoteDb.signup(username, password, function (err, response) {
        if (err) {
            if (err.name === 'conflict') {
            console.log('user already exists, choose another username');
            } else if (err.name === 'forbidden') {
            console.log('invalid username');
            } else {
            console.log('signup failed');
            }
        }
        });
    }

    loginUser(): void {
        let usernameInput: any = document.getElementById('login-username');
        let passwordInput: any = document.getElementById('login-password');
        let username = usernameInput.value;
        let password = passwordInput.value;
        usernameInput.value = '';
        passwordInput.value = '';
        this.remoteDb.login(username, password, (err, response)=> {
            if (err) {
                if (err.name === 'unauthorized') {
                console.log('name or password incorrect');
                } else {
                console.log('login failed');
                }
            }
            this.showLogin();
        });
    }

    logoutUser(): void {
        this.remoteDb.logout((err, response)=> {
            if (err) {
                console.log('logout error');
            }
            console.log(response);
            this.showLogin();
        });
    }

    showLogin(): void {
        this.remoteDb.getSession(function (err, response) {
            if (err) {
                console.log('getSession network error');
            } else if (!response.userCtx.name) {
                console.log('nobody logged in');
                let statusLine = document.getElementById('status-line');
                statusLine.innerHTML = 'Nobody logged in';
            } else {
                console.log(response.userCtx.name);
                let statusLine = document.getElementById('status-line');
                statusLine.innerHTML = 'Welcome, '+response.userCtx.name;
            }
        }.bind(this));
    }
  }
}