var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var bodyParser = require("body-parser");

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({extended:false}));
app.use(bodyParser.json());


const request = require("request");
const csv = require('csvtojson');
const nodejieba = require("nodejieba");
nodejieba.load({dict:"./dict.txt"});
const fs = require("fs");

let Countys = {
  "臺北":"01_taipei",
  "新北":"02_newtaipei",
  "桃園":"03_taoyuan",
  "新竹市":"04_hsinchu",
  "臺南":"05_tainan",
  "宜蘭":"06_ilan",
  "新竹":"07_hsinchu_country",
  "臺中":"08_taichung",
  "高雄":"09_kaohsiung",
  "金門":"10_kinmen",
  "南投":"11_nantou",
  "嘉義":"12_chiayi",
  "澎湖":"13_penghu",
  "臺東":"14_taitung",
  "屏東":"15_pingtung",
  "基隆":"16_keelung",
  "苗栗":"17_miaoli",
  "彰化":"18_changhua",
  "雲林":"19_yunlin",
  "嘉義縣":"20_chiayi_country",
  "花蓮":"21_hualien",
  "連江":"22_lianjiang",
  "行政院":"23_dataset"
}

let text = fs.readFileSync("./rel.txt",'utf8');
let relateData = {};
text.split(/\n/).forEach(line=>{
  let temp = line.split(" ");
  let temp2=[];
  for(let i=1;i<temp.length-1;i++){
    temp2.push(temp[i]);
  }
  relateData[temp[0]] = temp2;
})

app.all('*', (req, res, next) => {
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization, Accept,X-Requested-With,x-csrf-token');
  res.header('Access-Control-Allow-Methods', 'PUT, GET, POST, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Credentials', true);
  // 這裡不能用 * 號, 要改成 domain 的方式才能設置 cookies
  res.header('Access-Control-Allow-Origin', req.headers.origin);
  if (req.method === 'OPTIONS') {
    res.send(200);
  } else {
    next();
  }
});

app.post("/data/county",function(req,res){
  let promises=[];
  let dict = {};
  let wordsets=[];
  let countys = req.body.data;
  let key = req.body.key;
  let secondSearch={};
  if(countys.length == 0){
    for(index in Countys){
      countys.push(index);
    }
  }
  for(element in countys){
    promises.push(
      csv().fromFile(`./DataSet/${Countys[countys[element]]}.csv`).then((jsonObj)=>{
        let temp = jsonObj;
        temp.forEach((item)=>{
          let cuts = nodejieba.cut(item["資料集名稱"]);
          cuts.forEach(it=>{
            if(it.length>=2){
              if(dict[it]!=null){
                dict[it]++;
              }else{
                dict[it]=1;
              }
            }
          })
          if(cuts.includes(key)){
            cuts.forEach(it=>{
              if(it.length>=2){
                if(secondSearch[it]!=null){
                  secondSearch[it]++;
                }else{
                  secondSearch[it]=1;
                }
              }
            })
          }
        })
      })
    )
  }
  Promise.all(promises).then(()=>{
    if(key==undefined || countys.includes("行政院")){
      if(countys.includes("行政院")){
        for(item in dict){
          if(dict[item]>1000){
            wordsets.push([item,dict[item]]);
          }
        }
      }else{
        for(item in dict){
          if(dict[item]>20 && dict[item]<400){
            wordsets.push([item,dict[item]]);
          }
        }
      }
      res.send(wordsets);
    }else{
      for(item in secondSearch){
        if(secondSearch[item]>5){
          wordsets.push([item,secondSearch[item]]);
        }
      }
      res.send(wordsets);
    }
  })
})

app.post("/data/keyword",function(req,res){
  let key = req.body.key;
  res.send(relateData[key]);
})

app.post("/data/search",function(req,res){
  let search = req.body.search;
  let countys = req.body.countys;
  let promises=[];
  let dict={};
  let result=[];
  if(countys.length == 0){
    for(index in Countys){
      countys.push(index);
    }
  }
  console.log(search);
  console.log(countys);
  countys.forEach((element)=>{
    promises.push(
      csv().fromFile(`./DataSet/${Countys[element]}.csv`).then((jsonObj)=>{
        let temp = jsonObj;
        temp.forEach((item)=>{
          let cuts = nodejieba.cut(item["資料集名稱"]);
          if(cuts.includes(search)){
            result.push(item);
            if(dict[item["資料來源(部會單位)"]]!=undefined){
              dict[item["資料來源(部會單位)"]]++;
            }else{
              dict[item["資料來源(部會單位)"]]=1;
            }
          }
        })
      })
    )
  })
  Promise.all(promises).then(()=>{
    res.send({dict:dict,result:result});
  })
})

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
