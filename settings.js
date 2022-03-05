let dbname = process.env.DB_NAME || "agenda";
let dbhost = process.env.DB_HOST || "localhost";
let dburi = process.env.DB_URI || null;
let appId = process.env.API_KEY;
let httpport = process.env.HTTP_PORT || 80;
let httpsport = process.env.HTTPS_PORT || 443;
let servercertpfxpath = process.env.SERVER_CERT_PFX_PATH;
let servercertpfxpass = process.env.SERVER_CERT_PFX_PASS;
let carootcertpath = process.env.CA_ROOT_CERT_PATH;
let collection = "agendaJobs";
let definitions = "jobDefinitions";
let timeout = 5000;

const settings = {
  get agendaMongoUrl() {
    return dburi ? dburi : `mongodb://${dbhost}/${dbname}`;
  },
  get dbname() {
    return dbname;
  },
  set dbname(value) {
    dbname = value;
  },
  get dburi() {
    return dburi;
  },
  set dburi(value) {
    dburi = value;
  },
  get dbhost() {
    return dbhost;
  },
  set dbhost(value) {
    dbhost = value;
  },
  get collection() {
    return collection;
  },
  set collection(value) {
    collection = value;
  },
  get definitions() {
    return definitions;
  },
  set definitions(value) {
    definitions = value;
  },
  get timeout() {
    return timeout;
  },
  set timeout(value) {
    timeout = value;
  },
  get appId() {
    return appId;
  },
  set appId(value) {
    appId = value;
  },
  get httpport() {
    return httpport;
  },
  set httpport(value) {
    httpport = value;
  },
  get httpsport() {
    return httpsport;
  },
  set httpsport(value) {
    httpsport = value;
  },
  get servercertpfxpath() {
    return servercertpfxpath;
  },
  set servercertpfxpath(value) {
    servercertpfxpath = value;
  },
  get servercertpfxpass() {
    return servercertpfxpass;
  },
  set servercertpfxpass(value) {
    servercertpfxpass = value;
  },
  get carootcertpath() {
    return carootcertpath;
  },
  set carootcertpath(value) {
    carootcertpath = value;
  }
};

module.exports = settings;
