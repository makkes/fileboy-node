FROM    centos:centos6
RUN     rpm -Uvh http://download.fedoraproject.org/pub/epel/6/i386/epel-release-6-8.noarch.rpm
RUN     yum install -y npm
COPY    . /src
WORKDIR /src
RUN     npm install
# do not know why, but only when I explicitly install sqlite3 it gets compiled
# for this specific OS (esp. wrt. glibc)
RUN     npm install sqlite3
EXPOSE  3000
CMD     ["npm", "start"]
