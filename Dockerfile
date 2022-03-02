FROM node:latest

RUN npm install -g jwalkerlusd/agenda-rest

#expose
EXPOSE 4040

CMD ['agenda-rest']
