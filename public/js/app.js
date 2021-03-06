(function() {

  'use strict';

  var ENTER_KEY = 13;
  var syncDom = document.getElementById('sync-wrapper');

  // EDITING STARTS HERE (you dont need to edit anything above this line)

  var app = new Vue({
    el: '#subprojectapp',
    data: {
      searchString: '',
      username: '',
      projects: [],
      selectedProject: -1,
      syncState: 'test',
      activeContribution: null,
      editContribution: null,
      contributions: null,
      nowTime: null
    },
    watch: {
    },
    computed: {
      activeContributionTitle: function() {
        if (this.activeContribution !== null) {
          return this.activeContribution.project.title;
        }
        else {
          return "";
        }
      },
      contributionTimeString: function() {
        if (this.activeContribution !== null) {
          var sec_num = Math.trunc(((this.nowTime.toDate()).getTime() - (this.activeContribution.start.toDate()).getTime())/1000);
          return secondsToTimeString(sec_num);
        }
        else {
          return '';
        }
      },
      filteredProjects: function() {
        var that = this;
        var result = this.projects.filter(function (p) {
          return p.doc.title.indexOf(that.searchString) > -1 || (p.doc.description !== undefined && p.doc.description.indexOf(that.searchString) > -1);
        });
        return result;
      },
      allTags: function() {
        var tags = [],
            uniqTags,
            that = this;
        this.projects.forEach(function(p) {
          tags = tags.concat(that.projectTags(p));
        });
        uniqTags = tags.filter(function(item, pos) {
          return (tags.indexOf(item) == pos);
        });
        return uniqTags;
      },
      isUserLoggedIn: function() {
        return this.username !== '';
      },
      isActiveContribution: function() {
        return this.activeContribution !== null;
      }
    },
    methods: {
      isSelected: function(p) {
        return this.filteredProjects.indexOf(p) == this.selectedProject;
      },
      searchInputFocus: function() {
        this.selectedProject = -1;
      },
      searchInputBlur: function() {
        this.selectedProject = -1;
      },
      listItemClicked: function(p, event) {
        // TODO: little hack to prevent that a click on the 'details' button is used here
        if (event.toElement.tagName === 'DIV') {
          this.editContribution = createContribution(p.doc);
          showContribution(false);
        }
      },
      searchInputKeyUp: function(event) {
        if (event.keyCode === ENTER_KEY) {
          if (this.selectedProject === -1) {
            showCreateProject(this.searchString);
          }
          else {
            this.editContribution = createContribution(this.filteredProjects[this.selectedProject].doc);
            showContribution(false);
          }
          this.searchString = '';
        }
        else if (event.keyCode == 38) { // up
          if (this.selectedProject === -1) {
            this.selectedProject = 0;
          }
          else if (this.selectedProject > 0) {
            this.selectedProject--;
          }
        }
        else if (event.keyCode == 40) { // down
          if (this.selectedProject === -1) {
            this.selectedProject = 0;
          }
          else if (this.selectedProject < this.filteredProjects.length-1) {
            this.selectedProject++;
          }
        }
        else if (event.keyCode == 39) { // right
          if (this.selectedProject >= 0)
          {
            this.showDetails(this.filteredProjects[this.selectedProject]);
          }
        }
      },
      projectTags: function(p) {
        var tags,
            uniqTags;
        var desc = p.doc.description;
        if (!desc)
        {
          return [];
        }
        tags = desc.match(/\B\#\w+\b/g);
        if (tags) {
          uniqTags = tags.filter(function(item, pos) {
            return (tags.indexOf(item) == pos);
          });
        }
        return uniqTags || [];
      },
      insertTagToDesc: function(t) {
        console.log("insert " + t);
        var desc = document.getElementById('create-project-description');
        desc.value += t + " ";
      },
	  showDetails: function(p) {
      $("#propertyDetailsTitle")[0].innerHTML=p.doc.title;
      $("#propertyDetailsDescription")[0].innerHTML=p.doc.description;
      $("#projectDetails").modal();
      loadContributions(p);
	  },
      createProject: createProject,
      contributeToProject: contributeToProject,
      contributeLive: contributeLive,
      editLiveContribution: function() {
        showContribution(true);
      }
    },
    directives: {
    }
  });

  var db = new PouchDB('todos');
  var remoteDb = new PouchDB('http://admin:admin@192.168.33.10:5984/todos', {skip_setup: true});

  function secondsToTimeString(sec_num) {
    var hours   = Math.floor(sec_num / 3600);
    var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
    var seconds = sec_num - (hours * 3600) - (minutes * 60);

    if (hours   < 10) {hours   = "0"+hours;}
    if (minutes < 10) {minutes = "0"+minutes;}
    if (seconds < 10) {seconds = "0"+seconds;}
    return hours+':'+minutes+':'+seconds;
  }

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
        app.username = '';
      } else {
        app.username = response.userCtx.name;
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
    descInput.value = '';
    descInput.focus();
  }

  function showContribution(isLive) {
    var panel = $('#contribute-project-panel');
    panel.modal();
    var contrib = app.editContribution;
    var titleInput = document.getElementById('contribute-project-title');
    var descInput = document.getElementById('contribute-project-description');
    var commentInput = document.getElementById('contribute-project-comment');
    $('#contribution-start-picker').data("DateTimePicker").date(contrib.start);
    if (isLive) {
      contrib.duration = moment.duration(Math.trunc(((app.nowTime.toDate()).getTime() - (app.activeContribution.start.toDate()).getTime())));
    }
    var base = moment("01-01-2000","MM-DD-YYYY")
    $('#contribution-duration-picker').data("DateTimePicker").date(base.add(contrib.duration).format("HH:mm"));
    titleInput.value = contrib.project.title;
    descInput.value = contrib.project.description;
    commentInput.value = contrib.comment;
    // hack since just focus doesn't work if datepicker is used
    window.setTimeout(function() { commentInput.focus(); }, 500);
    if (isLive) {
      $('#contribute-live-button').hide();
    }
    else {
      $('#contribute-live-button').show();
    }
  }

  function createProject() {
    var titleInput = document.getElementById('create-project-title');
    var descInput = document.getElementById('create-project-description');
    addProject(titleInput.value, descInput.value);
  }

  function contributeToProject() {
    var commentInput = document.getElementById('contribute-project-comment');
    app.editContribution.comment = commentInput.value;
    app.editContribution.start = $('#contribution-start-picker').data("DateTimePicker").date();
    var durDate = app.editContribution.duration = $('#contribution-duration-picker').data("DateTimePicker").date();
    app.editContribution.duration = moment.duration({
      minutes: durDate.minutes(),
      hours: durDate.hours()
    })
    addContribution(app.editContribution);
    app.activeContribution = null;
  }

  function contributeLive() {
    var titleInput = document.getElementById('contribute-project-title');
    app.activeContribution = app.editContribution;
  }

  function addProject(text, desc) {
    var todo = {
      _id: new Date().toISOString(),
      title: text,
      description: desc,
      completed: false
    };
    console.log('db.put' + todo);
    db.put(todo, function callback(err, result) {
      if (!err) {
        console.log('Successfully posted a project!');
      }
    });
  }

  function createContribution(project) {
    var start = moment();
    return {
      _id: new Date().toISOString(),
      project: project,
      user: app.username,
      comment: '',
      start: start,
      duration: moment.duration(1, 'hours')
    };
  }

  function addContribution(contrib) {
    var todb = Object.assign({}, contrib);
    todb.project = todb.project._id;
    todb.start = todb.start.format("MM-DD-YYYY HH:mm")
    todb.duration = moment.utc(todb.duration.asMilliseconds()).format("HH:mm")
    console.log('db.put:')
    console.log(todb);
    db.put(todb, function callback(err, result) {
      if (!err) {
        console.log('Successfully posted a contribution!');
      }
    });
  }
  
  function viewDetails() {
	  
  }

  // Show the current list of todos by reading them from the database
  function showTodos() {
    db.allDocs({include_docs: true, descending: true}).then(function(doc) {
      console.log(doc.rows)
      app.$data["projects"] = doc.rows.filter(function(r) { return r.doc.title !== undefined });
    });
  }

  function loadContributions(project) {
    db.allDocs({include_docs: true, descending: true}).then(function(doc) {
      console.log(doc.rows)
      app.$data["contributions"] = doc.rows.filter(function(r) { return r.doc.project !== undefined && r.doc.project === project.doc._id && r.doc.user });
      console.log(app.$data["contributions"]);
    });
  }

  // Initialise a sync with the remote server
  function sync() {
    app.syncState = 'Syncing';
    var opts = {live: true};
    db.replicate.to(remoteDb, opts, syncError);
    db.replicate.from(remoteDb, opts, syncError);
  }

  // There was some form or error syncing
  function syncError() {
    app.syncState = 'Sync error';
  }

  setupHeadline();
  showTodos();
  showLogin();
  $(function () {
    $('#contribution-start-picker').datetimepicker({showTodayButton: true});
    $('#contribution-duration-picker').datetimepicker({format: 'HH:mm'});
  });
  setInterval(function(){ app.nowTime = moment(); }, 1000);

  if (remoteDb) {
    sync();
  }

})();
