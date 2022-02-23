FROM python:3.9-slim

WORKDIR /app

ENV IN_DOCKER true

COPY *.py /app/
COPY web/ /app/web/

EXPOSE 8080/tcp
EXPOSE 8553/tcp
EXPOSE 1234-1236/udp

LABEL "description"="WiFi translation Hub"

CMD [ "python3", "wifitranslationhub.py"]
