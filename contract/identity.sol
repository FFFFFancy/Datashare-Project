// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.7.0 <0.9.0;

/**
 * @title IdentityControl
 */
 
contract IdentityControl{
    uint256 public users;
    
    mapping(address => identity) Identity;// address - identity of the network peers

    PointsTransaction[] public transactionsInfo;

    address superAddress;
    
    struct identity{
        string name;
        string ip; //the ip of the file server
        uint256 port;// the port used to provide the service
        bool isUsed; //judge the address if has been used
        uint256 points; //积分点
        bool isSuper;   //  是否是超级账户
    }

    // model points transaction
    enum TransactionType {
        Earned,
        Redeemed
    }

    struct PointsTransaction {
        uint timestamp;
        uint points;
        TransactionType transactionType;
        address identityAddress;
    }
    
    constructor(){
        users = 0;
    }
    
    function isRegister(address _add) public view returns(bool){
        return Identity[_add].isUsed;   
    }    

    // function isSuperIdentity(address _add) public view returns(bool){
    //     return Identity[_add].isSuper;
    // }

    modifier onlySuper(address _add){
        require(_add == superAddress, "Only SuperIdentity has the right.");
        _;
    }

    modifier hasPoints(address _add, uint _points) {
        // verify enough points for member
        require(Identity[_add].points >= _points, "Insufficient points.");
        _;
    }
    
    // register at firt when join the network
    function register(string memory _name, string memory _ip, uint256 _port) public{
        users ++;
        identity memory new_identity = identity(_name,_ip,_port,true,10,false);
        Identity[msg.sender] = new_identity;
    }

    function earnPoints(address _add)public 
        onlySuper(_add)
        returns(bool){
        Identity[_add].points ++;

        // add transction
        transactionsInfo.push(PointsTransaction({
            points: Identity[_add].points,
            timestamp: block.timestamp,
            transactionType: TransactionType.Earned,
            identityAddress: _add
        }));

        return true;
    }

    function usePoints(address _add)public 
        onlySuper(_add)
        hasPoints(_add,1)
        returns(bool){
        Identity[_add].points --;

        // add transction
        transactionsInfo.push(PointsTransaction({
            points: Identity[_add].points,
            timestamp: block.timestamp,
            transactionType: TransactionType.Redeemed,
            identityAddress: _add
        }));

        return true;
    }
    
    function getIdentity(address _add) public view returns(identity memory){
        return Identity[_add];
    }

    function getName(address _add) public view returns(string memory){
        return Identity[_add].name;
    }
    
    function getUrl(address _add) public view returns(string memory,uint256){
        return (Identity[_add].ip,Identity[_add].port);
    }
    
    function getIp(address _add) public view returns(string memory){
        return (Identity[_add].ip);
    }
    
    function getPort(address _add)public view returns(uint256){
        return (Identity[_add].port);
    }
}