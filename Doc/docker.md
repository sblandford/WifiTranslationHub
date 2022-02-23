### Building and using the Docker

docker build --tag wifitranslationhub .\
docker run --net=host --name wifitranslationhub wifitranslationhub

#### Use config file on host

docker run --net=host -v config.py:/app/config.py --name wifitranslationhub wifitranslationhub

#### Store state in directory on host

docker run --net=host -v /path/to/.configdir:/app/.config --name wifitranslationhub wifitranslationhub
