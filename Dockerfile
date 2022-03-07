FROM node:latest

WORKDIR /agenda-rest

RUN npm install -g jwalkerlusd/agenda-rest#no-webpack

#expose
EXPOSE 4040

CMD ['agenda-rest']
