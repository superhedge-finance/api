# Superhedge API

> Backend off-chain processing and data record management

## How to set up local environment

> **Important!** Ts.ED requires Node >= 14, Express >= 4 and TypeScript >= 4.

1. Clone this repository on localhost.

2. Create an environment file named `.env` (copy .env.example).

3. Edit /src/Server.ts file for http or https deployment accordingly

4. Install dependencies using 'yarn' package manager

```bash
yarn
```

5. Run the api server(default port: 3000)
```bash
yarn start

# build for production
yarn build
yarn start:prod
```

## How to deploy and run on the hosting server

1. Clone this repository on the server.

2. Create an environment file named `.env` (copy .env.example).

3. Edit /src/Server.ts file for http or https deployment accordingly

4. Build the container image using 'docker build'.

```bash
sudo docker build -t superhedge-api .
```

5. Run the container in the background using 'docker run'.

```bash
sudo docker run -d -p 3000:3000 superhedge-api
```
