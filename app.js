var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

const bodyParser = require('body-parser');
const session = require('express-session');
const MongoClient = require('mongodb').MongoClient;
const nodejieba = require('nodejieba');
nodejieba.load({dict:"./dict.txt"});
const fs = require("fs");
let text = fs.readFileSync("./rel2.txt",'utf8');

let relateData = {};
text.split(/\n/).forEach(line=>{
  let temp = line.split(" ");
  let temp2=[];
  for(let i=1;i<temp.length-1;i++){
    temp2.push(temp[i]);
  }
  relateData[temp[0]] = temp2;
})
// relateData為保存關鍵字的字典檔，格式為   
//  {'捕捉': [ '中心', '公告', '收容', '嘉義市' ],
//   '基準法': [ '勞動', '違反', '單位', '事業' ] }
// MongoClient.connect("mongodb://localhost:27017/",function(err,db){
//   var dbo = db.db("opendata");
//   dbo.collection('taipei').find({"county":"新北市"}).toArray(function(err,result){
//     if(err) throw err
//     console.log(result.length)
//     db.close()
//   });
// });


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({extended:false}));
app.use(bodyParser.json());
app.use(session({
  secret: "keyboard cat",
  resave : false,
  saveUninitialized:true,
  cookie: { maxAge:60*1000*60 }
}))



app.all('*', (req, res, next) => {
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization, Accept,X-Requested-With,x-csrf-token');
  res.header('Access-Control-Allow-Methods', 'PUT, GET, POST, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Origin', req.headers.origin);
  res.header('Access-Control-Allow-Credentials', true);
  if (req.method === 'OPTIONS') {
    res.send(200);
  } else {
    next();
  }
});

app.use('/', indexRouter);
app.use('/users', usersRouter);

app.get('/get_wordcloud_dict',function(req,res){
  county = req.query.county;
  query = {"county":county}
  if(county == undefined){
    query = undefined
  }
  MongoClient.connect("mongodb://localhost:27017/",function(err,db){
    var dbo = db.db("opendata");
    dbo.collection('taipei').find(query).toArray(function(err,result){
      if(err) throw err
      dict = jiebatodict(result)
      res.send(dict)
      db.close()
    });
  });
})

app.get("/get_relateKey",function(req,res){
  let relateKey = relateData[req.query.keyword];
  res.send(relateKey)
})

app.post("/get_smallcloud",function(req,res){
  let relateKey = relateData[req.body.keyword];
  let frontNumber = req.body.frontNumber;
  let promises = []
  for(let i in relateKey){
    promises.push(filterWord(relateKey[i]))
  }
  var promiseValue = Promise.all(promises);
  promiseValue.then(function(data){
    smallcloudArr = []
    //取出現次數最多前20且>10的字典，因此轉Arr做排序
    for(let i in data){
      let temp = jiebatodict(data[i]) //回傳字典
      smallcloudArr.push(sortAndslice(temp,frontNumber))
    }
    res.send(smallcloudArr)
  })
})

app.get("/search_data",function(req,res){
  let word = req.query.keyword 
  MongoClient.connect("mongodb://localhost:27017/",function(err,db){
    var dbo = db.db("opendata");
    dbo.collection('taipei').find({"title":new RegExp(word)}).toArray(function(err,result){
      res.send(result)
      db.close()
    });  
  });
})

function jiebatodict(arr){
  let dict = {};
  for(let i in arr){
    let cuts = nodejieba.cut(arr[i].title)
    let avoidRepeat = []
    cuts.forEach(it=>{
      if(it.length>1 && !avoidRepeat.includes(it)){
        if(dict[it]!=null){
          dict[it]++;
        }else{
          dict[it]=1;
        }
        avoidRepeat.push(it);
      }
    })
  }
  return dict
}

function filterWord(word){
  return new Promise((resolve,reject)=>{
    MongoClient.connect("mongodb://localhost:27017/",function(err,db){
      var dbo = db.db("opendata");
      dbo.collection('taipei').find({"title":new RegExp(word)}).toArray(function(err,result){
        resolve(result)
        db.close()
      });  
    });
  })
}

function sortAndslice(dict,sliceNumber){
  var newdict = {}
  var items = Object.keys(dict).map(function(key) {
    return [key, dict[key]];
  });
  items.sort(function(first, second) {
    return second[1] - first[1];
  });
  items = items.slice(0,sliceNumber)
  for(let i in items){
    newdict[items[i][0]] = items[i][1]
  }
  return newdict 
}

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;