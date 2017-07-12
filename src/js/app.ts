import Vue from "vue"
import * as users from "./usermanagement";
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
  let remoteDb: any = new PouchDB_('http://admin:admin@localhost:5984/todos', {skip_setup: true});
  let login: users.UserManagement.Login = new users.UserManagement.Login(remoteDb);


  function setupHeadline() {
    let signupLink = document.getElementById('signup-button');
    signupLink.addEventListener('click', login.signupUser.bind(login));

    let loginLink = document.getElementById('login-button');
    loginLink.addEventListener('click', login.loginUser.bind(login));

    let logoutLink = document.getElementById('logout-button');
    logoutLink.addEventListener('click', login.logoutUser.bind(login));
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

  setupHeadline();
  showTodos();
  login.showLogin();

  if (remoteDb) {
    sync();
  }

})();
