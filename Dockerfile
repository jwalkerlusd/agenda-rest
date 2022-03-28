FROM node:16

WORKDIR /agenda-rest

RUN npm install -g jwalkerlusd/agenda-rest

#expose
EXPOSE 80

CMD ["agenda-rest"]
