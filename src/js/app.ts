import Vue from "vue"
require("bootstrap");
let PouchDB_ = require("pouchdb");
PouchDB_.plugin(require('pouchdb-authentication'));
(function() {

  'use strict';

  let ENTER_KEY: number = 13;
  let syncDom = document.getElementById('sync-wrapper');

  // EDITING STARTS HERE (you dont need to edit anything above this line)

  let app = new Vue({
    el: '#todoapp',
    data: {
      searchString: '',
      projects: []
    },
    watch: {
    },
    computed: {
      filteredProjects: function() {
        let that = this;
        return this["projects"].filter(function (p) {
          return p.doc.title.indexOf(that["searchString"]) > -1;
        });
      }
    },
    methods: {
      createProject: function() {
        addTodo(this["searchString"]);
        this["searchString"] = '';
      }
    },
    directives: {
    }
  });

  let db = new PouchDB_('todos');
  let remoteDb: any = new PouchDB_('http://admin:admin@192.168.33.10:5984/todos', {skip_setup: true});

  function signupUser() {
    let usernameInput: any = document.getElementById('signup-username');
    let passwordInput: any = document.getElementById('signup-password');
    let username = (<HTMLInputElement>document.getElementById('signup-username')).value;
    let password = passwordInput.value;
    usernameInput.value = '';
    passwordInput.value = '';
    remoteDb.signup(username, password, function (err, response) {
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

  function loginUser() {
    let usernameInput: any = document.getElementById('login-username');
    let passwordInput: any = document.getElementById('login-password');
    let username = usernameInput.value;
    let password = passwordInput.value;
    usernameInput.value = '';
    passwordInput.value = '';
    remoteDb.login(username, password, function (err, response) {
      if (err) {
        if (err.name === 'unauthorized') {
          console.log('name or password incorrect');
        } else {
          console.log('login failed');
        }
      }
      showLogin();
    });
  }

  function logoutUser() {
    remoteDb.logout(function (err, response) {
      if (err) {
        console.log('logout error');
      }
      console.log(response);
      showLogin();
    });
  }

  function showLogin() {
    remoteDb.getSession(function (err, response) {
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
    });
  }

  function setupHeadline() {
    let signupLink = document.getElementById('signup-button');
    signupLink.addEventListener('click', signupUser);

    let loginLink = document.getElementById('login-button');
    loginLink.addEventListener('click', loginUser);

    let logoutLink = document.getElementById('logout-button');
    logoutLink.addEventListener('click', logoutUser);
  }

  db.changes({
    since: 'now',
    live: true
  }).on('change', showTodos);

  interface TodoItem {
    readonly _id: string;
    title: string;
    completed: boolean;
  }
  // We have to create a new todo document and enter it in the database
  function addTodo(text) {
    let todo = {
      _id: new Date().toISOString(),
      title: text,
      completed: false
    };
    console.log('db.put' + todo);
    db.put(todo, function callback(err, result) {
      if (!err) {
        console.log('Successfully posted a todo!');
      }
    });
  }

  // Show the current list of todos by reading them from the database
  function showTodos() {
    db.allDocs({include_docs: true, descending: true}).then(function(doc) {
      console.log(doc.rows)
      app.$data["projects"] = doc.rows
    });
  }

  // Initialise a sync with the remote server
  function sync() {
    syncDom.setAttribute('data-sync-state', 'syncing');
    let opts = {live: true};
    db.replicate.to(remoteDb, opts, syncError);
    db.replicate.from(remoteDb, opts, syncError);
  }

  // EDITING STARTS HERE (you dont need to edit anything below this line)

  // There was some form or error syncing
  function syncError() {
    syncDom.setAttribute('data-sync-state', 'error');
  }

  // User has double clicked a todo, display an input so they can edit the title
  function todoDblClicked(todo: TodoItem) {
    let div = document.getElementById('li_' + todo._id);
    let inputEditTodo = document.getElementById('input_' + todo._id);
    div.className = 'editing';
    inputEditTodo.focus();
  }

  // If they press enter while editing an entry, blur it to trigger save
  // (or delete)
  function todoKeyPressed(todo, event) {
    if (event.keyCode === ENTER_KEY) {
      let inputEditTodo = document.getElementById('input_' + todo._id);
      inputEditTodo.blur();
    }
  }

  setupHeadline();
  showTodos();
  showLogin();

  if (remoteDb) {
    sync();
  }

})();
