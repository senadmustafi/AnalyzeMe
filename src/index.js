import express from "express";
import bodyParser from "body-parser";
import connection from './connection.js';
import mongo from 'mongodb';
import auth from "./auth.js";
import { use } from "bcrypt/promises";
import res from "express/lib/response";
import nodePortScanner from 'node-port-scanner';
import Wappalyzer from 'wappalyzer';
import axios from 'axios';
import dns  from 'dns';
import fs from 'fs';
import cors from "cors";
import http from "http";
import socketIO from "socket.io";
import sleep from 'await-sleep';
import * as https from "https";
const socektConnection = []




const app = express()
const options ={
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  
  
}
app.use(cors())
app.use(bodyParser.json())
const httpServer = require("http").Server(app);
const port = 3000
const io = require("socket.io")(httpServer, options);



io.on("connection", (socket) => {
  socektConnection[socket.id]=true
  socket.on("disconnect", (reason) => {
    socektConnection[socket.id]=false
  }); 

});






app.get('/', (req, res) => {
  res.send("Site is under construction")

})


//JWT Test
app.get('/secret', [auth.verify], (req, res) => {
  res.json({ message: req.jwt.email });

})



// Login 
app.post('/auth', async (req, res) => {
  let user = req.body;

  try {
    let result = await auth.authenticateUser(user.email, user.password);
    res.json({ result: result });
  }
  catch (e) {
    res.status(401).json({ error: e.message });
  }


})


// Create account / Register
app.post('/users', async (req, res) => {
  let user = req.body;

  let id;
  try {
    id = await auth.registerUser(user);
  }
  catch (e) {
    res.status(500).json({ error: e.message })
  }

  res.json({ id });

})



//Scan wordPress admins
app.post('/scan-wp-users', async (req, res) => {
  try{
  let domain = req.body;
  const ourdata = await axios.get(domain.domain + "/wp-json/wp/v2/users" );
  const filtererddata = ourdata.data;
  let lista = []
  filtererddata.forEach(author => {
    lista.push(author.slug); 
})

res.json(lista);
  }
  catch(e){
    return res.json("Data is not available on this wp site")
  }

})

app.post('/subdomain', async (req, res) => {
  try{
    var  {mydomain}  = req.body
   const ourdata = await axios.get(`https://crt.sh/?q=${mydomain}&output=json`);
    const filtererddata = ourdata.data;
  let lista = []
  filtererddata.forEach(subdomain => {
    if(lista.includes(subdomain.common_name)){
    }else{
    lista.push(subdomain.common_name);
  } 
})

res.json(lista);
  }
  catch(e){
    return res.json("Subdomain not found")
  }

})


//dir

app.post('/dir', [auth.verify], async (req, res) => {
  let domain = req.body;
  let myemail = req.jwt.email;
  let SocketClientId = req.header("X-Socketio-Id")
  var array = fs.readFileSync('assets/smaldir.txt', 'utf8').replace(/\r\n/g,'\n').split('\n');

res.writeHead(200, {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*"
});
console.log(myemail);
for(let i=0; i < array.length; i++){
      try {
        if(array[i] == "SVRTLUVORC1PRi1TQ0FOLUFORC1JVC1XSUxMLVNUT1A="){
          io.emit(myemail, { item:array[i]} );
          console.log("End of Dir Scaning!")
          break
      }
          const { status } = await axios.get(domain.dns+"/"+array[i],{
            httpsAgent: new https.Agent({
              rejectUnauthorized: false
            })
          });
          if (status === 200) {
              io.emit(myemail, { item:array[i], status});

}
          if(!socektConnection[SocketClientId]){
            break
          }
      } catch (error) {
          console.error(`Error Occured: ${error}`, array[i]);

      }
      io.emit(myemail+"interaction",{numberofinteraction:i});
      await sleep(20);
}
});


// Get from MongoDB history about user analyzes
app.get('/history/webstatus', [auth.verify], async (req, res) => {
  let db = await connection();

  try {
    let cur = await db.collection("shodan_data").find()
    let curArray = await cur.toArray()
    const filteredArray = curArray.filter(obj => obj.your_email === req.jwt.email)
    return res.json(filteredArray)
  }
  catch (e) {
    console.log(e);
  }
})


//Search for open Port
app.post('/openport', async (req, res) => {
  let ipData = req.body;
  let ip = JSON.stringify(ipData.ip).replace(/[\"\\]/g, "");
  let port = parseInt(ipData.ports)




  try {
    const portScanOnIp = await nodePortScanner(ip, [port]);
    console.log(portScanOnIp)
    return res.json(portScanOnIp.ports);


  }
  catch (e) {

  }
})


// Looking for my Public IPv4
app.get('/my-ip', async (req, res) => {
  try {
    var ip = require('what-is-my-ip-address');
    const my_ip = req.headers["x-forwarded-for"];
    return res.json({ip:my_ip})



  }
  catch (e) {
    console.log(e)
  }
})

//DNS LOOK UP

app.post('/dnslookup', (req, res) => {
  let DNS = req.body
  let stringdns = JSON.stringify(DNS.DNS).replace(/"/g, "");
  console.log(stringdns)
  try{
      dns.lookup(stringdns, function (err, address) {
          if (err) {
              console.log(err);
              res.status(500).json({ error: err });
          } else {
              res.json({ address });
          }
      });
 

  }
  catch(e){
    console.log(e);
  }
})



//Wapalyzer

app.post('/webtech', async (req, res) => {
  let domain = req.body;
  try {
    const url = domain.domain;

    const options = {
      debug: false,
      delay: 500,
      headers: {},
      maxDepth: 3,
      maxUrls: 10,
      maxWait: 14000,
      recursive: false,
      probe: false,
      userAgent: 'Wappalyzer',
      htmlMaxCols: 2000,
      htmlMaxRows: 2000,
      noScripts: false,
    };

    const wappalyzer = new Wappalyzer(options)

    try {
      await wappalyzer.init()

      // Optionally set additional request headers
      const headers = {}

      const site = await wappalyzer.open(url, headers)

      // Optionally capture and output errors
      site.on('error', console.error)

      const results = await site.analyze()

      return res.json(results);
      
    } catch (error) {
      console.error(error)
    }

    await wappalyzer.destroy()



  }
  catch (e) {
    console.log(e)
  }
})




// Analyez website status
app.post('/webstatus', [auth.verify], async (req, res) => {
  let db = await connection();
  var { ip } = req.body
  console.log(ip)


  // Make request
  try {
    const shodan_get_data = await axios.get(`https://internetdb.shodan.io/${ip}`);
    let shodan_data = (shodan_get_data.data)


    let shodan_pass_data = {
      your_email: req.jwt.email,
      date: Date(),
      country_name: shodan_data.country_name,
      city: shodan_data.city,
      ip: ip,
      ports: shodan_data.ports,
      os: shodan_data.os,
      isp: shodan_data.isp,
      vulns: shodan_data.vulns,

    }

    await db.collection('shodan_data').insertOne(shodan_pass_data)

    return res.json({ shodan_pass_data })
  }
  catch (e) {
    return res.json({ error: "Task failed" })
  }



})


httpServer.listen(port, () => console.log(`Port ${port}`))