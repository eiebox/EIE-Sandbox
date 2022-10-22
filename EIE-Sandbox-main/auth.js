// 1) Create a new firebaseui.auth instance stored to our local variable ui
const ui = new firebaseui.auth.AuthUI(firebase.auth())

// 2) These are our configurations.
const uiConfig = {
  callbacks: {
    signInSuccessWithAuthResult(authResult, redirectUrl) {
      return true
    },
    uiShown() { 
      document.getElementById("loader").style.display = "none"
    },
  },
  signInFlow: "popup",
  signInSuccessUrl: "signedIn",
  signInOptions: [
    firebase.auth.EmailAuthProvider.PROVIDER_ID,
    firebase.auth.GoogleAuthProvider.PROVIDER_ID,
    // Additional login options should be listed here
    // once they are enabled within the console.
  ],
}

// 3) Call the 'start' method on our ui class
// including our configuration options.
ui.start("#firebaseui-auth-container", uiConfig)