//包的依赖
const http = require("http");
const express = require("express");
const Web3 = require("web3");
const fs = require("fs");

//初始化文件配置
let config = fs.readFileSync("config.json");
let configdata = JSON.parse(config);

const port = configdata.port;
const hostAddress = configdata.hostAddress;

const identityAbi = configdata.identityAbi;
const modelAbi = configdata.modelAbi;
const datacontrolAbi = configdata.datacontrolAbi;
const categoryAbi = configdata.categoryAbi;

const identityAddress = configdata.identityAddress;
const modelAddress = configdata.modelAddress;
const datacontrolAddress = configdata.datacontrolAddress;
const categoryAddress = configdata.categoryAddress;


//利用web3和链建立联系
if (typeof web3 !== "undefined") {
  console.log("No web3");
  web3 = new Web3(web3.currentProvider);
} else {
  // set the provider you want from Web3.providers
  console.log("get!");
  web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
  // console.log(web3.eth.accounts);
}
// 根据abi编码和地址构建合约实例
var DataContract = new web3.eth.Contract(datacontrolAbi, datacontrolAddress);
var ModelContract = new web3.eth.Contract(modelAbi, modelAddress);
var IdentityContract = new web3.eth.Contract(identityAbi, identityAddress);
var CategoryContract = new web3.eth.Contract(categoryAbi, categoryAddress);

//定义express服务器 
var server = express();
//配置express中间件
server.use(express.json());
server.use(express.urlencoded({
  extended: true
}));
server.use("/*", function(request, response, next) {
  response.header("Access-Control-Allow-Origin", "*");
  response.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
  response.header("Access-Control-Allow-Methods", "PUT,POST,GET,DELETE,OPTIONS");
  response.header("Access-Control-Allow-Credentials", true); //可以带cookies
  response.header("X-Powered-By", 'Express');
  if (request.method == 'OPTIONS') {
    response.sendStatus(200);
  } else {
    next();
  }
});

//可能使用到的函数
function unique(arr) {
  return Array.from(new Set(arr));
}


//数据相关智能合约
//获取链上的智能合约存储的最大个数
server.get("/getNum", function(request, response) {
  console.log("getNum");
  DataContract.methods
    .maxNum()
    .call()
    .then((value) => {
      let res = {};
      res["num"] = value;
      response.send(res);
    });
});

async function getDataNum() {
  let value = DataContract.methods.maxNum().call();
  return value;
}


//根据上传的数据集的SerialNum获取对应数据集的信息
server.get("/getDataInf", function(request, response) {
  console.log("getDataInf");
  let serialNum = request.query.serialNum;
  console.log("Target Data is", serialNum);
  //调用getDataInf接口获取数据值
  DataContract.methods.getDataInf(serialNum).call().then((value) => {
    let res = {};
    res["serialNum"] = value.serialNum;
    res["ownerAddress"] = value.ownerAddress;
    res["id"] = value.id;
    res["ownerName"] = value.ownerName;
    res["name"] = value.name;
    res["category"] = value.category;
    res["description"] = value.description;
    res["isOpen"] = value.isOpen;
    console.log(res)
    response.send(res);
  });
});

//获取可用的数据
server.get("/getvalidData", function(request, response) {
  console.log("/getvalidData");
  getDatalist().then(value => {
    res = {};
    res["list"] = value;
    response.send(res);
  });
});

async function getDatalist() {
  let num = await DataContract.methods.maxNum().call();
  let value = []
  console.log(num);
  for (let i = 1; i <= num; i++) {
    let flag = await DataContract.methods.isAvailable(i).call();
    console.log(flag);
    if (flag) {
      value.push(i);
    }
  }
  console.log("Datalist:", value);
  return value;
}

server.get("/getPublicData", function(request, response) {
  console.log("getPublicData");
  getPublicList().then(value => {
    res = {};
    res["list"] = value;
    response.send(res);
  });
});

async function getPublicList() {
  let num = await DataContract.methods.maxNum().call();
  console.log(num);
  let value = []
  for (let i = 1; i <= num; i++) {
    let flag1 = await DataContract.methods.isAvailable(i).call();
    console.log(flag1);
    let flag2 = await isPublic(i);
    console.log(flag2);
    if (flag1 && flag2) {
      value.push(i);
    }
    // console.log("Publiclist", value);
  }
  console.log("PublicDatalist:", value);
  return value;
}

async function isPublic(i) {
  let value = await DataContract.methods.getDataInf(i).call();
  let flag = value.isOpen;
  return flag;
}

server.get("/getPrivateData", function(request, response) {
  console.log("getPrivateData");
  getPrivateList().then(value => {
    res = {};
    res["list"] = value;
    response.send(res);
  });
});

async function getPrivateList() {
  let num = await DataContract.methods.maxNum().call();
  let value = []
  for (let i = 1; i <= num; i++) {
    let flag3 = await DataContract.methods.isAvailable(i).call();
    let flag4 = await isPublic(i);
    if (flag3 && (!flag4)) {
      value.push(i);
    }
    // console.log("Privatelist:", value);
  }
  console.log("PrivateDatalist:", value);
  return value;
}

//删除某一个数据 by serialNum
server.delete("/deleteDatabySerialNum", function(request, response) {
  console.log("/deleteDatabySerialNum");
  let _serialNum = request.body.serialNum;
  DataContract.methods.deleteDatabySerialNum(_serialNum).send({
    from: hostAddress
  }).then(value => {
    let returnValues = value.events.functionState.returnValues
    console.log(returnValues.description);
    let res = {};
    if (returnValues.state) {
      res['state'] = true;
      res['message'] = returnValues.description;
    } else {
      res['state'] = false;
      res['message'] = returnValues.description;
    }
    response.send(res);
  });
})

//删除某一个数据 by id
server.delete("/deleteDatabyId", function(request, response) {
  console.log("deleteDatabyId");
  let _id = request.body.id;
  DataContract.methods.deleteDatabyID(_id).send({
    from: hostAddress
  }).then(value => {
    let returnValues = value.events.functionState.returnValues
    console.log(returnValues.description);
    let res = {};
    if (returnValues.state) {
      res['state'] = true;
      res['message'] = returnValues.description;
    } else {
      res['state'] = false;
      res['message'] = returnValues.description;
    }
    response.send(res);
  });
});


//上传数据集信息
server.post("/upLoadData", function(request, response) {
  console.log("upLoadData");
  let metaData = request.body;
  let _id = metaData.id;
  let _name = metaData.name;
  let _category = metaData.category;
  let _description = metaData.description;
  let _isOpen = metaData.isOpen;
  console.log(_category);
  DataContract.methods.upLoadData(_id, _name, _category, _description, _isOpen).send({
    from: hostAddress
  }).then((value) => {
    // console.log(value);
    // let number = await getDataNum();
    let returnValues = value.events.functionState.returnValues;
    console.log(returnValues);
    console.log(returnValues.description);
    let res = {};
    if (returnValues.state) {
      res['state'] = true;
      res['message'] = returnValues.description;
      DataContract.methods.maxNum().call().then(number => {
        res['serialNum'] = number;
        response.send(res);
      })
    } else {
      res['state'] = false;
      res['message'] = returnValues.description;
      res['serialNum'] = -1;
      response.send(res);
    }

  });
});

//数据购买与身份认证
//后端验证收到的请求是否合法
server.post("/verify", function(request, response) {
  console.log("verify");
  let body = request.body;
  let _address = body.address;
  let _target = body.target;
  let _ip = body.ip;
  let _type = body.type;
  if (_type == "0" || _type == 0) {
    DataContract.methods.verify(_address, _target, _ip).call().then((value) => {
      let res = {};
      res["state"] = value;
      response.send(res);
    });
  } else {
    ModelContract.methods.verify(_address, _target, _ip).call().then(value => {
      let res = {};
      res["state"] = value;
      response.send(res);
    })
  }

});

//前端发送数据下载请求
server.post("/buyData", function(request, response) {
  console.log("buyData");
  let serialNum = request.body.serialNum;
  console.log("Target Data is", serialNum);
  DataContract.methods.buyData(serialNum).send({
    from: hostAddress
  }).then((value) => {
    let returnValues = value.events.functionState.returnValues;
    console.log(value);
    console.log(returnValues.description);
    let res = {};
    if (returnValues.state) {
      res['state'] = true;
      res['message'] = returnValues.description;
    } else {
      res['state'] = false;
      res['message'] = returnValues.description;
    }
    response.send(res);
  });
});


//后端将接收到的日志上链
server.post("/addLog", function(request, response) {
  console.log("addLog");
  let body = request.body;
  let _address = body.address;
  let _target = body.target;
  let _ip = body.ip;
  let _time = body.time;
  DataContract.methods.addlog(_address, _target, _ip, _time).send({
    from: hostAddress
  }).then((value) => {
    let returnValues = value.events.functionState.returnValues
    console.log(returnValues.description);
    let res = {};
    if (returnValues.state) {
      res['state'] = true;
      res['message'] = returnValues.description;
    } else {
      res['state'] = false;
      res['message'] = returnValues.description;
    }
    response.send(res);
  });
});

//前端页面获取某一个数据集的访问历史
server.get("/getLogs", function(request, response) {
  console.log("getLogs");
  let _serialNum = request.query.serialNum;
  DataContract.methods.getLogs(_serialNum).call().then((value) => {
    let num = value["0"];
    let logs = value["1"];
    let list = []
    for (var i = 0; i < num; i++) {
      let newjson = {};
      newjson["name"] = logs[i].name;
      newjson["time"] = logs[i].time;
      newjson["ip"] = logs[i].ip;
      list.push(newjson);
    }
    let res = {};
    res["num"] = num;
    res["Logs"] = list
    response.send(res);
  });
});

//和模型相关的api
server.get("/model/getNum", function(request, response) {
  console.log("model/getNum");
  ModelContract.methods
    .num()
    .call()
    .then((value) => {
      let res = {};
      res["num"] = value;
      response.send(res);
    });
})


server.post("/model/buyModel", function(request, response) {
  console.log("model/buyModel");
  let serialNum = request.body.serialNum;
  console.log("Target Model is", serialNum);
  ModelContract.methods.buyModel(serialNum).send({
    from: hostAddress
  }).then((value) => {
    let returnValues = value.events.functionState.returnValues;
    console.log(value);
    console.log(returnValues.description);
    let res = {};
    if (returnValues.state) {
      res['state'] = true;
      res['message'] = returnValues.description;
    } else {
      res['state'] = false;
      res['message'] = returnValues.description;
    }
    response.send(res);
  });
});

server.get("/model/getModelInf", function(request, response) {
  console.log("/model/getModelInf");
  let serialNum = request.query.serialNum;
  console.log("Target modelindex is", serialNum);
  ModelContract.methods.getModel(serialNum).call().then((value) => {
    // console.log(value);s
    let res = {};
    res["serialNum"] = value.serialNum;
    res["ownerAddress"] = value.ownerAddress;
    res["ownerName"] = value.ownerName;
    res["id"] = value.id;
    res["name"] = value.name;
    res["category"] = value.category;
    res["description"] = value.description;
    res["dataSets"] = value.dataSets;
    res["isFinished"] = value.isFinished;
    console.log(res);
    response.send(res);
  });
});

server.post("/model/upLoad", function(request, response) {
  console.log("/model/upLoad");
  let body = request.body;
  let _id = body.id;
  let _name = body.name;
  let _category = body.category;
  let _description = body.description;
  let _datasets = body.datasets;
  ModelContract.methods.upLoadModel(_id, _name, _category, _description, _datasets).send({
      from: hostAddress
    })
    .then(value => {
      let returnValues = value.events.functionState.returnValues
      console.log(returnValues.description);
      let res = {};
      if (returnValues.state) {
        res['state'] = true;
        res['message'] = returnValues.description;
      } else {
        res['state'] = false;
        res['message'] = returnValues.description;
      }
      response.send(res);
    });
});


server.post("/model/changeState", function(request, response) {
  console.log("/model/changeState");
  let body = request.body;
  let _serialNum = body.serialNum;
  let _state = body.state;
  let _participant = body.participant;
  ModelContract.methods.changState(_serialNum, _state, _participant).send({
      from: hostAddress
    })
    .then(value => {
      let returnValues = value.events.functionState.returnValues
      console.log(returnValues.description);
      let res = {};
      if (returnValues.state) {
        res['state'] = true;
        res['message'] = returnValues.description;
      } else {
        res['state'] = false;
        res['message'] = returnValues.description;
      }
      response.send(res);
    });
});

server.get("/model/getParticipant", function(request, response) {
  console.log("/model/getParticipant");
  let serialNum = request.query.serialNum;
  console.log("Target model is", serialNum);
  ModelContract.methods.getParticipant(serialNum).call().then(value => {
    console.log(value);
    let list = value.participant;
    let res = {};
    res["participant"] = list;
    response.send(res);
  });
});

server.delete("/model/deleteModelbyId", function(request, response) {
  console.log("model/deleteModelbyId");
  let _id = request.body.id;
  ModelContract.methods.deleteModelById(_id).send({
    from: hostAddress
  }).then(value => {
    let returnValues = value.events.functionState.returnValues
    console.log(returnValues.description);
    let res = {};
    if (returnValues.state) {
      res['state'] = true;
      res['message'] = returnValues.description;
    } else {
      res['state'] = false;
      res['message'] = returnValues.description;
    }
    response.send(res);
  });
});

server.delete("/model/deleteModelbySerialNum", function(request, response) {
  console.log("model/deleteModelbySerialNum");
  let _serialNum = request.body.serialNum;
  ModelContract.methods.deleteModelByserialNum(_serialNum).send({
    from: hostAddress
  }).then(value => {
    let returnValues = value.events.functionState.returnValues
    console.log(returnValues.description);
    let res = {};
    if (returnValues.state) {
      res['state'] = true;
      res['message'] = returnValues.description;
    } else {
      res['state'] = false;
      res['message'] = returnValues.description;
    }
    response.send(res);
  });
});

//获取可用的模型
server.get("/getvalidmodel", function(request, response) {
  console.log("/getvalidmodel");
  getModellist().then(value => {
    res = {};
    res["list"] = value;
    response.send(res);
  });
});

async function getModellist() {
  let num = await ModelContract.methods.num().call();
  let value = []
  console.log(num);
  for (let i = 1; i <= num; i++) {
    // console.log(i);
    let flag = await ModelContract.methods.isAvailable(i).call();
    console.log(flag);
    if (flag) {
      value.push(i);
    }
  }
  console.log("Modellist:", value);
  return value;
}

server.get("/model/getDataToModel", function(request, response) {
  console.log("getDataToModel");
  let _serialNum = request.query.serialNum;
  ModelContract.methods.getDataTomodel(_serialNum).call().then(value => {
    console.log(value);
    let res = {};
    res["list"] = value;
    response.send(res);
  });
});

server.get("/model/getModelToData", function(request, response) {
  console.log("getModelToData");
  let _serialNum = request.query.serialNum;
  ModelContract.methods.getModelToData(_serialNum).call().then(value => {
    console.log(value);
    let res = {};
    res['list'] = value;
    response.send(res);
  })
});

//身份管理相关
//根据address获取链上关于address的身份信息
server.get("/getIdentity", function(request, response) {
  console.log("getIdentity");
  let address = request.query.address;
  console.log("Target Address is", address);
  IdentityContract.methods.getIdentity(address).call().then((value) => {
    // console.log(value);
    let res = {};
    res["name"] = value.name;
    res["ip"] = value.ip;
    res["port"] = value.port;
    res["isUsed"] = value.isUsed;
    res["points"] = value.points;
    res["isSuper"] = value.isSuper;
    response.send(res);
  });
});

//Category相关的代码
//获取可用的category对应的name
server.get("/Category/validList", function(request, response) {
  console.log("Category/validList");
  getCategorylist().then(value => {
    response.send(value);
  });
});

async function getValidCategory() {
  let num = await CategoryContract.methods.num().call();
  let value = [];
  for (let i = 1; i <= num; i++) {
    let flag = await CategoryContract.methods.isAvailable(i).call();
    if (flag) {
      value.push(i)
    }
  }
  return value;
}

async function getValidNameList() {
  let num = await CategoryContract.methods.num().call();
  let value = [];
  for (let i = 1; i <= num; i++) {
    let flag = await CategoryContract.methods.isAvailable(i).call();
    if (flag) {
      let name = await CategoryContract.methods.getCategoryName(i).call();
      value.push(name);
    }
  }
  return value;
}

async function getCategorylist() {
  let categoryList = await getValidCategory();
  let nameList = await getValidNameList();
  let res = {};
  res["numlist"] = categoryList;
  res["namelist"] = nameList;
  return res;
}

server.delete("/Category/delete", function(request, response) {
  console.log("/Category/delete");
  let _serialNum = request.query.serialNum;
  CategoryContract.methods.deleteCategory(_serialNum).send({
    from: hostAddress
  }).then(value => {
    let returnValues = value.events.functionState.returnValues
    console.log(returnValues.description);
    let res = {};
    if (returnValues.state) {
      res['state'] = true;
      res['message'] = returnValues.description;
    } else {
      res['state'] = false;
      res['message'] = returnValues.description;
    }
    response.send(res);
  });
});

server.post("/Category/upLoad", function(request, response) {
  console.log("Category/upLoad");
  let body = request.body;
  console.log(body);
  upLoadCate(body).then(returnValues => {
    let res = {};
    if (returnValues.state) {
      res['state'] = true;
      res['message'] = returnValues.description;
    } else {
      res['state'] = false;
      res['message'] = returnValues.description;
    }
    response.send(res);
  })
});

async function upLoadOne(_id, _serialNum, _cateNum, _name, _metric, _value) {
  let value = await CategoryContract.methods.upLoadModel(_id, _serialNum, _cateNum, _name, _metric, _value).send({
    from: hostAddress
  });
  let returnValues = value.events.functionState.returnValues;
  console.log(returnValues.description);
  return returnValues;
}

async function upLoadCate(body) {
  console.log(body);
  let _list = body.list;
  let returnValues = {};
  for (let i = 0; i < _list.length; i++) {
    let id = body.id;
    let serialNum = body.serialNum;
    let cateNum = body.category;
    let name = _list[i].name;
    let metric = _list[i].metric;
    let value = _list[i].value;
    returnValues = await upLoadOne(id, serialNum, cateNum, name, metric, value);
    // console.log("metric ", i, " has been uploaded successfully");
  }
  if (_list.length == 0) {
    returnValues['description'] = "No metric";
  }
  return returnValues;
}

server.post("/Category/getMetric", function(request, response) {
  console.log("Category/getMetric");
  let _id = request.body.id;
  let _cateNum = request.body.category;
  let _serialNum = request.body.serialNum;
  CategoryContract.methods.getModel(_id, _serialNum, _cateNum).call().then(value => {
    let len = value['0'];
    let metrics = value['1'];
    console.log(metrics);
    let list = []
    for (let i = 0; i < len; i++) {
      let newjson = {};
      newjson["name"] = metrics[i].name;
      newjson["metric"] = metrics[i].metric;
      newjson["value"] = metrics[i].value;
      list.push(newjson);
    }
    let res = {};
    res["list"] = list;
    response.send(res);
  })
});

server.get("/Category/getName", function(request, response) {
  console.log("Category/getName");
  let _serialNum = request.query.serialNum;
  CategoryContract.methods.getCategoryName(_serialNum).call().then(value => {
    let res = {};
    res["name"] = value;
    response.send(res);
  })
});

//绑定端口，开启服务器
server.listen(port, () => {
  console.log("启动服务器在", port);
  IdentityContract.methods.getIdentity(hostAddress).call().then((value) => {
    console.log("当前用户名称为", value.name);
  });
});