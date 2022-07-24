# APIGateway
The node js server that will act as the gateway for microservices (atm acting as the entire api server)

# for compiling
Create .env file in format of the .env.example
run "npm install"

# Run on docker 

`cp docker-compose.override.yml.example docker-compose.override.yml`

Then modify your local copy of `docker-compose.override.yml` to suit your local testing environment.

`docker-compose up --build -d`

Then you can run the following to boot the container stack and view its console to follow logs and debug.

`docker-compose up -d && docker-compose logs -f`
