<div align="center">
  <h1>Superhedge Api</h1>
  <br />
</div>

> An awesome project based on Ts.ED framework

## How to set up local environment

> **Important!** Ts.ED requires Node >= 14, Express >= 4 and TypeScript >= 4.

1. Clone this repository on localhost.

2. Create an enviroment file named `.env` (copy .env.example) and fill the next enviroment variables

```
# Amazon RDS (PostgreSQL) connection information
DATABASE_HOST=
DATABASE_NAME=
DATABASE_USER=
DATABASE_PASSWORD=
DATABASE_PORT=
```
3. Install dependencies using 'yarn' package manager

```bash
$  yarn
```

4. Run the api server(default port: 3000)
```bash
$  yarn start

# build for production
$  yarn build
$  yarn start:prod
```

## How to deploy and run on the hosting server

1. Clone this repository on the server.

2. Create an enviroment file named `.env` (copy .env.example) and fill the next enviroment variables.

```
# Amazon RDS (PostgreSQL) connection information
DATABASE_HOST=
DATABASE_NAME=
DATABASE_USER=
DATABASE_PASSWORD=
DATABASE_PORT=
```

3. Build the container image using 'docker build'.

```bash
sudo docker build -t superhedge-api .
```

4. Run the container in the background using 'docker run'.

```bash
sudo docker run -d -p 3000:3000 superhedge-api
```
