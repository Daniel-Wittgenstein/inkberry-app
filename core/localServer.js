const express = require("express");
const getLocalhostPort = require("./getLocalhostPort.js");
const { dialog } = require("electron");

let expressApp = null;
let expressServer = null;

function listenOnPort(attemptCount, maxAttempts, onStarted, log) {
  if (attemptCount >= maxAttempts) {
    onStarted(false);
    return;
  }
  const port = getLocalhostPort(attemptCount);
  log(`Starting to listen at port: ${port} (attempt: ${attemptCount + 1} ` + `of ${maxAttempts})`);
  expressServer = expressApp
    .listen(port, () => {
      const msg = `Started local server at http://localhost:${port}`;
      log(msg);
      onStarted(true, port);
    })
    .on("error", (error) => {
      if (error.code === "EADDRINUSE") {
        log(`Port ${port} is already in use.`);
      } else {
        log(`Error occurred while trying to listen ` + `on port ${port}: ${error.message}`);
      }
      attemptCount++;
      listenOnPort(attemptCount, maxAttempts, onStarted, log);
    });
}

function startLocalServer(pathToServe, onStarted, log) {
  const startIt = () => {
    expressApp = express();
    expressApp.use(express.static(pathToServe));
    listenOnPort(0, 9, onStarted, log);
  };

  if (expressServer) {
    //automatically close the old server, if there is one:
    log("Closing old local server first ...");

    expressServer.close((err) => {
      if (err) {
        dialog.showMessageBox({
          message:
            `Express could not close the local server. Sorry. ` +
            `Please restart the inkberry app. `,
          type: "error",
        });
        console.error("Error while closing server:", err);
        return;
      }
      log("Old server closed!");
      console.log("Old server closed.");
      startIt();
    });

    // ######################################
    expressServer.closeAllConnections();
    // #############################################
    // ABOUT expressServer.closeAllConnections:
    // #############################################
    // 1. Yes, this line goes here and not in the callback
    // of "expressServer.close()"

    // 2. Yes, we need "expressServer.close()" AND
    // "expressServer.closeAllConnections()", and we need them exactly in that order.

    // 3. Why we need this: Because it forces all connections to
    // die. If you do not have this line, the server takes longer
    // and longer to close and eventually just doesn't close at all.
    // Probably some unclosed connections stuff, I have no clue, to be honest.

    // see here: https://nodejs.org/api/http.html#servercloseallconnections
    // ##################################################
  } else {
    startIt();
  }
}

function shutdownLocalServer() {
  if (!expressServer) return;
  console.log("Trying to shut down the Express server ...");
  expressServer.close(() => {
    console.log("Express server was shut down!");
  });
}

module.exports = { startLocalServer, shutdownLocalServer };
