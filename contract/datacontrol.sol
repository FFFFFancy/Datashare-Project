// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.7.0 <0.9.0;

import "./identity.sol";

contract DataControl {
    uint256 public maxNum; //合约中曾经存储过的最大的个数，用于计算新上传的合约的maxNum

    uint256[] indexList;

    mapping(address => targetData) TargetData; //当前账户想要下载的合约的序列号

    mapping(address => uint256[]) Ownerdata; // 账户的地址 - 账户上传的数据的映射

    mapping(string => uint256) IdToserialNum; //数据的合约ID - 合约序列号的映射

    mapping(uint256 => metaData) Dataset; //合约中数据的序列号 - 数据本身的映射

    mapping(uint256 => assessmentOfData) Assess; //合约中数据的序列号 - 当前对数据的评价结构体的映射

    mapping(uint256 => log[]) Logs; //合约中数据的序列号—-数据访问历史的映射

    IdentityControl identityControl;

    constructor(address _identityControl) {
        maxNum = 0;
        identityControl = IdentityControl(_identityControl);
    }

    struct metaData {
        uint256 serialNum; // Serial number of the dataset in the contract
        address ownerAddress; //The address of the owner
        string id; //The id of the dataset
        string ownerName; //The name of the owner of the dataset
        string name; //The name of the dataset
        uint256 category; //The category of the type for the dataset
        string description; // The description of the dataset
        bool isOpen; //decide if the dataset is open
        bool isUsed;
    }

    struct assessmentOfData {
        uint256 serialNum;
        uint256 downLoads; //下载数
        uint256 likes; //点赞数
    }

    struct targetData {
        uint256 serialNum;
    }

    struct log {
        string name;
        string time; //完成数据传输的时间
        string ip;
    }

    event functionState(string functionName, bool state, string description);

    function isAvailable(uint256 _serialNum) public view returns (bool) {
        return Dataset[_serialNum].isUsed;
    }

    function getDataInf(uint256 _serialNum)
        public
        view
        returns (metaData memory)
    {
        metaData memory data = Dataset[_serialNum];
        return data;
    }

    function upLoadData(
        string memory _id,
        string memory _name,
        uint256 _category,
        string memory _description,
        bool _isOpen
    ) public {
        if (strcmp(_id, "")) {
            emit functionState("upLoadData", false, "invalid id");
        } else if (!identityControl.isRegister(msg.sender)) {
            emit functionState(
                "upLoadData",
                false,
                "The address has not been registered"
            );
        } else {
            maxNum++; //serial Num of the dataset
            uint256 num = maxNum; //当前上传的数据集所对应的序列号
            string memory _ownerName = identityControl.getName(msg.sender);
            metaData memory data = metaData(
                num,
                msg.sender,
                _id,
                _ownerName,
                _name,
                _category,
                _description,
                _isOpen,
                true
            );
            assessmentOfData memory assess = assessmentOfData(num, 0, 0);
            Assess[num] = assess;
            Dataset[num] = data;
            Ownerdata[msg.sender].push(num);
            IdToserialNum[_id] = num;
            if(!identityControl.earnPoints(msg.sender)){
                emit functionState("upLoadData", true, "upload succeed");
            }
            else{
                emit functionState("upLoadData", true, "upload succeed but failed to earn points.");
            }
        }
    }

    //根据serialNum删除对应的数据
    function deleteDatabySerialNum(uint256 _serialNum) public {
        metaData memory data = Dataset[_serialNum];
        if (msg.sender != data.ownerAddress) {
            emit functionState("deleteDatabySerialNum", false, "No permission");
        } else if (_serialNum > maxNum) {
            emit functionState(
                "deleteDatabySerialNum",
                false,
                "invalid serialNum"
            );
        } else {
            Dataset[_serialNum].isUsed = false;
            emit functionState(
                "deleteDatabySerialNum",
                true,
                "Delete successfully"
            );
        }
    }

    //根据ID删除对应的数据
    function deleteDatabyID(string memory _id) public {
        uint256 _serialNum = IdToserialNum[_id];
        metaData memory data = Dataset[_serialNum];
        if (msg.sender != data.ownerAddress) {
            emit functionState("deleteDatabyID", false, "No permission");
        } else if (_serialNum > maxNum) {
            emit functionState("deleteDatabyID", false, "invalid serialNum");
        } else {
            Dataset[_serialNum].isUsed = false;
            emit functionState(
                "deleteDatabySerialNum",
                true,
                "Delete successfully"
            );
        }
    }

    //购买数据
    function buyData(uint256 _serialNum) public {
        metaData memory metadata = Dataset[_serialNum];
        if (!identityControl.isRegister(msg.sender)) {
            emit functionState(
                "buyData",
                false,
                "The address has not been registered"
            );
        } else if (!metadata.isUsed) {
            emit functionState("buyData", false, "The data has been deleted");
        } else if (metadata.isOpen) {
            address add = msg.sender;
            targetData memory target = targetData(_serialNum);
            TargetData[add] = target;
            if(!identityControl.usePoints(msg.sender)){
                emit functionState("buyData", true, "buy data succeed");
            }
            else{
                emit functionState("buyData", false, "The points is insufficient to buy data");
            }
            
        }
    }

    //backend call
    function verify(
        address _add1,
        uint256 _serialNum,
        string memory _ip
    ) public view returns (bool) {
        uint256 SN = TargetData[_add1].serialNum;
        string memory testIp;
        uint256 testPort;
        (testIp, testPort) = identityControl.getUrl(_add1);
        if ((SN == _serialNum) && (strcmp(_ip, testIp))) {
            return true;
        } else {
            return false;
        }
    }

    function addlog(
        address _add1,
        uint256 _serialNum,
        string memory _ip,
        string memory _time
    ) public {
        if (verify(_add1, _serialNum, _ip)) {
            string memory _name = identityControl.getName(_add1);
            log memory _log = log(_name, _time, _ip);
            Logs[_serialNum].push(_log);
            //添加下载数目
            Assess[_serialNum].downLoads = Assess[_serialNum].downLoads + 1;
            emit functionState(
                "addlog",
                true,
                "add log succeed and add 1 to downloads"
            );
        } else {
            emit functionState("addlog", false, "permissionless request");
        }
    }

    function getLogsNum(uint256 _serialNum) public view returns (uint256) {
        return Logs[_serialNum].length;
    }

    function getLog(uint256 _serialNum, uint256 LogsNum)
        public
        view
        returns (
            string memory,
            string memory,
            string memory
        )
    {
        log memory _log = Logs[_serialNum][LogsNum];
        return (_log.name, _log.time, _log.ip);
    }

    function getLogs(uint256 _serialNum)
        public
        view
        returns (uint256, log[] memory)
    {
        uint256 len = Logs[_serialNum].length;
        return (len, Logs[_serialNum]);
    }

    //internal functions
    //对比两个字符串是否相等
    function strcmp(string memory a, string memory b)
        internal
        pure
        returns (bool)
    {
        if (bytes(a).length != bytes(b).length) {
            return false;
        } else {
            bytes memory _a = bytes(a);
            bytes memory _b = bytes(b);
            return keccak256(_a) == keccak256(_b);
        }
    }

    //判断该账户地址是否在identity模块进行注册
    function isRegister(address _add) internal view returns (bool) {
        return identityControl.isRegister(_add);
    }

    // function bonus(address _add) internal returns (bool) {
    //     return identityControl.addPoints(_add);
    // }
}
