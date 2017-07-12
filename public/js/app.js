(function() {

  'use strict';

  var ENTER_KEY = 13;
  var syncDom = document.getElementById('sync-wrapper');

  // EDITING STARTS HERE (you dont need to edit anything above this line)

  var app = new Vue({
    el: '#todoapp',
    data: {
      searchString: '',
      projects: []
    },
    watch: {
    },
    computed: {
      filteredProjects: function() {
        var that = this;
        return this["projects"].filter(function (p) {
          return p.doc.title.indexOf(that["searchString"]) > -1;
        });
      }
    },
    methods: {
      showCreateProject: function() {
        showCreateProject(this["searchString"]);
        this["searchString"] = '';
      },
      createProject: createProject
    },
    directives: {
    }
  });

  var db = new PouchDB('todos');
  var remoteDb = new PouchDB('http://admin:admin@192.168.33.10:5984/todos', {skip_setup: true});

  function signupUser() {
    var usernameInput = document.getElementById('signup-username');
    var passwordInput = document.getElementById('signup-password');
    var username = usernameInput.value;
    var password = passwordInput.value;
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
    var usernameInput = document.getElementById('login-username');
    var passwordInput = document.getElementById('login-password');
    var username = usernameInput.value;
    var password = passwordInput.value;
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
        var statusLine = document.getElementById('status-line');
        statusLine.innerHTML = 'Nobody logged in';
      } else {
        console.log(response.userCtx.name);
        var statusLine = document.getElementById('status-line');
        statusLine.innerHTML = 'Welcome, '+response.userCtx.name;
      }
    });
  }

  function setupHeadline() {
    var signupLink = document.getElementById('signup-button');
    signupLink.addEventListener('click', signupUser);

    var loginLink = document.getElementById('login-button');
    loginLink.addEventListener('click', loginUser);

    var logoutLink = document.getElementById('logout-button');
    logoutLink.addEventListener('click', logoutUser);
  }

  db.changes({
    since: 'now',
    live: true
  }).on('change', showTodos);

  function showCreateProject(title) {
    var panel = $('#create-project-panel');
    panel.modal();
    var titleInput = document.getElementById('create-project-title');
    var descInput = document.getElementById('create-project-description');
    titleInput.value = title;
    descInput.focus();
  }

  function createProject() {
    var titleInput = document.getElementById('create-project-title');
    var descInput = document.getElementById('create-project-description');
    addTodo(titleInput.value);
  }

  function addTodo(text) {
    var todo = {
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
    var opts = {live: true};
    db.replicate.to(remoteDb, opts, syncError);
    db.replicate.from(remoteDb, opts, syncError);
  }

  // There was some form or error syncing
  function syncError() {
    syncDom.setAttribute('data-sync-state', 'error');
  }

  setupHeadline();
  showTodos();
  showLogin();

  if (remoteDb) {
    sync();
  }

})();
