// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.7.0 <0.9.0;

import "./identity.sol";

/**
 * @title Model
 */
 
contract Model{
    uint256 public num;
    address superAddress;

    mapping(address=>uint256[]) ownerModel;
    mapping(uint256=>model) modelSet;
    mapping(uint256=>log) logs;
    mapping(address=>uint256) Targetmodel;
    mapping(uint256=>uint256[]) public ModelToData;
    mapping(uint256=>uint256[]) public DataToModel;

    IdentityControl identityControl;

    event functionState(string functionName, bool state, string description);

    struct model{
        uint256 serialNum;
        address ownerAddress;
        string ownerName;
        string id;
        string name;
        string category;
        string description;
        uint256[] dataSets;
        bool isFinished;
    }

    struct log{
        address[] participant;
    }


    constructor(address _identityControl,address _super){
        num = 0;
        superAddress = _super;
        identityControl = IdentityControl(_identityControl);
    }

    function buyModel(uint256 _serialNum) public{
        if(!identityControl.isRegister(msg.sender)){
            emit functionState("buyModel", true, "The address has not been registered");
        }else{
            address add = msg.sender;
            Targetmodel[add] = _serialNum;
            emit functionState("buyModel", true, "buy model succeed");
        }
    }   

    //backend call
    function verify(
        address _add1,
        uint256 _serialNum,
        string memory _ip
    ) public view returns (bool) {
        uint256 SN = Targetmodel[_add1];
        string memory testIp;
        uint256 testPort;
        (testIp,testPort) = identityControl.getUrl(_add1);
        if ((SN == _serialNum) && (strcmp(_ip, testIp))) {
            return true; 
        } else {
            return false;
        }
    }

    function getDataTomodel(uint256 _serialNum) public view returns(uint256[] memory){
        return DataToModel[_serialNum];
    }
    
    function getModelToData(uint256 _serialNum) public view returns(uint256[] memory){
        return ModelToData[_serialNum];
    }


    function changState(uint256 serialNum,bool state,address[] memory part) public{
        if (msg.sender == superAddress){
            logs[serialNum].participant = part;
            modelSet[serialNum].isFinished = state;
            emit functionState("changeState",true,"success");
        }else{
            emit functionState("changeState",false,"No permissions");
        }
    }

    function upLoadModel(
        string memory _id,
        string memory _name, 
        string memory _category,
        string memory _description,
        uint256[] memory _dataSets
    )public {
        if(strcmp(_id, "")){
            emit functionState("upLoadModel", false, "invalid id");
        }else if(!(identityControl.isRegister(msg.sender))){
            emit functionState("upLoadModel", false, "The address has not been registered");
        }else{
            num++;
            string memory _ownerName = identityControl.getName(msg.sender);
            model memory newModel = model(
                num,
                msg.sender,
                _ownerName,
                _id,
                _name,
                _category,
                _description,
                _dataSets,
                false
            );
            modelSet[num] = newModel;
            ownerModel[msg.sender].push(num);
            ModelToData[num] = _dataSets;
            for(uint256 i = 0;i<_dataSets.length;i++){
                DataToModel[_dataSets[i]].push(num);
            }
            emit functionState("upLoadModel",true,"upload success");
        }
    }

    function getModel(uint256 _serialNum)
        public
        view
        returns(model memory)
    {
        model memory data = modelSet[_serialNum];
        return data;
    }
    
    function getParticipant(uint256 _serialNum)
        public
        view
        returns(log memory)
    {
        return logs[_serialNum];
    }


    //internal functions
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
    function isRegister(address _add) internal view returns(bool){
        return identityControl.isRegister(_add);   
    }
}
