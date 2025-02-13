#!/usr/bin/env node

const commander = require("commander");
const fs = require("fs");

commander
  .option("-u, --dburi <dburi>", "[optional] Full Mongo connection string")
  .option("-d, --dbname <dbname>", "[optional] Name of the Mongo database")
  .option("-h, --dbhost <dbhost>", "[optional] Mongo instance's IP")
  .option("--httpport <httpport>", "[optional] HTTP listening port, default 80")
  .option("--httpsport <httpsport>", "[optional] HTTPS listening port, default 443")
  .option("-k, --key <key>", "[optional] X-API-KEY to be expected in headers")
  .option(
    "-t, --timeout <timeout>",
    "[optional] Timeout for request duration",
    (n, d) => Number(n) || d,
    5000
  )
  .option(
    "-a, --agenda_settings <agenda_settings>",
    "[optional] A JSON string containing additional agenda settings."
  )
  .option("--servercertpfxpath <servercertpfxpath>", "[optional] Path to server certificate (PFX) file")
  .option("--servercertpfxpass <servercertpfxpass>", "[optional] Passphrase to unlock server certificate")
  .option("--carootcertpath <carootcertpath>", "[optional] Path to Root CA Certificate (PEM) file")
  .parse(process.argv);

const options = commander.opts();

const settings = require("./settings");

settings.dburi = options.dburi || settings.dburi;
settings.dbname = options.dbname || settings.dbname;
settings.dbhost = options.dbhost || settings.dbhost;
settings.appId = options.key || settings.appId;
settings.httpport = options.httpport || settings.httpport;
settings.httpsport = options.httpsport || settings.httpsport;
settings.timeout = options.timeout || settings.timeout;
settings.servercertpfxpath = options.servercertpfxpath || settings.servercertpfxpath;
settings.servercertpfxpass = options.servercertpfxpass || settings.servercertpfxpass;
settings.carootcertpath = options.carootcertpath || settings.carootcertpath;

if (options.agenda_settings) {
  settings.agenda = JSON.parse(options.agenda_settings);
}

const { app, agenda } = require("./src");

const http = require('http');
const http_server = http.createServer(app.callback()).listen(settings.httpport, () => {
  console.log(`App listening on port ${settings.httpport}.`);
})

var https_server = undefined;
var https_options = {};

if (settings.servercertpfxpath) {
  https_options.pfx = fs.readFileSync(settings.servercertpfxpath);
  https_options.passphrase = settings.servercertpfxpass;
}

if (https_options.pfx) {
  const https = require('https');
  https_server = https.createServer(https_options, app.callback()).listen(settings.httpsport, () => {
    console.log(`App listening on port ${settings.httpsport}.`);
  });
}

async function graceful() {
  console.log("\nClosing HTTP server...");
  await http_server.close();
  if(https_server) {
    console.log("\nClosing HTTPS server...");
    await https_server.close();  
  }
  console.log("Shutting down Agenda instance gracefully...");
  await agenda.stop();
  process.exit(0);
}

process.on("SIGTERM", graceful);
process.on("SIGINT", graceful);
