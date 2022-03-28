const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const http = require("http");
const https = require("https");
const tls = require("tls");
const fs = require("fs");
const { isValidDate, buildUrlWithParams, buildUrlWithQuery } = require("./util");
const settings = require("../settings");

var carootcert = undefined;

if (settings.carootcertpath) {
  carootcert = fs.readFileSync(settings.carootcertpath);
}

const httpAgent = new http.Agent({
  keepAlive: true
});
var httpsAgent = undefined;
if (carootcert) {
  httpsAgent = new https.Agent({
    keepAlive: true,
    // prepend custom ca root certificate to default root certificates
    ca: [carootcert, ...tls.rootCertificates]
  });
}

const agentForProtocol = (_parsedURL) => {
  switch (_parsedURL.protocol) {
    case 'http:':
      return httpAgent;
    case 'https:':
      if (httpsAgent)
        return httpsAgent;
  }
}

const getCheckJobFormatFunction = (jobProperty, defaultJob = {}) => (job) => {
  if (!job.name || (jobProperty && !job[jobProperty])) {
    throw new Error(
      `expected request body to match {name${jobProperty ? `, ${jobProperty}` : ""
      }}`
    );
  }

  return { ...defaultJob, ...job };
};

const doNotCheck = (job) => job;

const getAssertFunction = (assertOnCount, errorOnName) => (job, jobs) =>
  jobs.countDocuments({ name: job.name }).then((count) => {
    if (!assertOnCount(count)) {
      throw new Error(errorOnName(job.name));
    }
  });

const jobAssertions = {
  alreadyExists: getAssertFunction(
    (count) => count > 0,
    (name) => `Did not find a job named "${name}"`
  ),
  notExists: getAssertFunction(
    (count) => count <= 0,
    (name) => `A job named "${name}" already exist`
  ),
  doNotAssert: () => true,
};

const defineJob = async (job, jobs, agenda) => {
  const { name, url, method, callback } = job;
  agenda.define(name, (job, done) => {
    const {
      attrs: { data },
    } = job;
    let uri = buildUrlWithParams({ url, params: data.params });
    uri = buildUrlWithQuery({ url: uri, query: data.query });

    const job_fetch_options = {
      agent: agentForProtocol,
      method: method || "POST",
      body: data.body,
      headers: data.headers || {},
    };

    // Error if no response in timeout
    Promise.race([
      new Promise((resolve, reject) =>
        setTimeout(() => reject(new Error("TimeOutError")), settings.timeout)
      ),
      fetch(uri, job_fetch_options),
    ])
      .catch((err) => {
        job.fail(`uri: ${uri} options: ${JSON.stringify(job_fetch_options)} message: ${err.message}`);
        return { error: err.message };
      })
      .then((result) => {
        if (callback) {
          const callback_fetch_options = {
            agent: agentForProtocol,
            method: callback.method || "POST",
            headers: callback.headers || {},
            body: { data, response: result },
          };
          return fetch(callback.url, callback_fetch_options);
        }
      })
      .catch((err) => job.fail(`failure in callback: ${err.message}`))
      .then(() => done());
  });

  await jobs
    .countDocuments({ name })
    .then((count) =>
      count < 1 ? jobs.insertOne(job) : jobs.updateOne({ name }, { $set: job })
    );

  return "job defined";
};

const deleteJob = async (job, jobs, agenda) => {
  const numRemoved = await agenda.cancel(job);
  const obj = await jobs.remove(job);
  return `removed ${obj.result.n} job definitions and ${numRemoved} job instances.`;
};

const cancelJob = async (job, jobs, agenda) => {
  const numRemoved = await agenda.cancel(job);
  return `${numRemoved} jobs canceled`;
};

const getDefaultJobForSchedule = () => ({
  data: {
    body: {},
    params: {},
    query: {},
  },
});

const pickValues = ({ obj, pickProps }) =>
  pickProps.reduce(
    (props, prop) => (obj[prop] ? [...props, obj[prop]] : props),
    []
  );
const scheduleTypes = {
  now: {
    fn: (agenda) => agenda.now.bind(agenda),
    message: "for now",
    getParams: (job) => pickValues({ obj: job, pickProps: ["name", "data"] }),
  },
  once: {
    fn: (agenda) => agenda.schedule.bind(agenda),
    message: "for once",
    getParams: (job) => {
      // TODO convert interval to Date or String
      //  - interval may be a Number, indicating a timestamp in seconds since Epoch
      //    - injested as new Date().setTime(interval)
      //  - interval may also be a human-readable String per date.js
      //    - ingested as Agenda.schedule(interval)
      //  - interval may also be a String in the format produced by Date.toJSON()
      //    - ingested as new Date(interval)
      // FOR NOW assumes String, ingestible by date.js (https://github.com/MatthewMueller/date)
      return pickValues({
        obj: { ...job },
        pickProps: ["interval", "name", "data"],
      });
    },
  },
  every: {
    fn: (agenda) => agenda.every.bind(agenda),
    message: "for repetition",
    getParams: (job) =>
      pickValues({
        obj: job,
        pickProps: ["interval", "name", "data", "options"],
      }),
  },
};

const getScheduleJobFunction = (scheduleType) => async (job, jobs, agenda) => {
  await scheduleType.fn(agenda)(...scheduleType.getParams(job));
  return `job scheduled ${scheduleType.message}`;
};

const getJobOperation = (checkFunction, jobFunction) => ({
  check: checkFunction,
  fn: jobFunction,
});

const jobOperations = {
  create: getJobOperation(getCheckJobFormatFunction("url"), defineJob),
  update: getJobOperation(getCheckJobFormatFunction(), defineJob),
  delete: getJobOperation(getCheckJobFormatFunction(), deleteJob),
  cancel: getJobOperation(doNotCheck, cancelJob),
  now: getJobOperation(
    getCheckJobFormatFunction(false, getDefaultJobForSchedule()),
    getScheduleJobFunction(scheduleTypes.now)
  ),
  once: getJobOperation(
    getCheckJobFormatFunction("interval", getDefaultJobForSchedule()),
    getScheduleJobFunction(scheduleTypes.once)
  ),
  every: getJobOperation(
    getCheckJobFormatFunction("interval", getDefaultJobForSchedule()),
    getScheduleJobFunction(scheduleTypes.every)
  ),
};

const promiseJobOperation = async (
  job,
  jobs,
  agenda,
  jobAssertion,
  jobOperation
) => {
  job = await jobOperation.check(job);
  await jobAssertion(job, jobs);
  return jobOperation.fn(job, jobs, agenda);
};

module.exports = { promiseJobOperation, jobOperations, jobAssertions, defineJob };
