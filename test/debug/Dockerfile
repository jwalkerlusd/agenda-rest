FROM node:16

# set working directory
WORKDIR /agenda-rest

# copy current source tree
COPY . .

# install dependencies
RUN npm install

#expose service and debugger ports
EXPOSE 80 9229

# run cli.js with node in inspection mode on 0.0.0.0:9229
CMD ["node", "--inspect=0.0.0.0:9229", "cli.js"]
