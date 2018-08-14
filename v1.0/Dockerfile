FROM node:6.11
WORKDIR /usr/caterpillar
EXPOSE 3000
EXPOSE 3010
EXPOSE 3200
RUN npm install -g ganache-cli gulp-cli httpserver @angular/cli@1.0.0
COPY caterpillar-core caterpillar-core
COPY execution-panel execution-panel
COPY services-manager services-manager
WORKDIR /usr/caterpillar/caterpillar-core
RUN npm install;gulp build
WORKDIR /usr/caterpillar/execution-panel
RUN npm install;ng build
WORKDIR /usr/caterpillar/services-manager
RUN npm install;gulp build
COPY scripts /usr/caterpillar/scripts
RUN apt-get update
RUN apt-get install dos2unix
RUN apt-get -y install vim
WORKDIR /usr/caterpillar/scripts
RUN dos2unix launch.sh
CMD sh /usr/caterpillar/scripts/launch.sh