// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.7.0 <0.9.0;

contract CategoryControl{
	uint256 num; //统计合约中存储了多少个分类

	mapping(string=>Model[]) data2Result; // map (dataid+field) => the model result
	mapping(uint256=>Category) categorySet;

	struct Model{
		string name;
		string value; 
	}

	struct Category{
		string name;
		bool isUsed;
	}

	constructor(){
		num = 0;
	}

	event functionState(string functionName, bool state, string description);

	function upLoadCategory(string memory _name) public{
		num++;
		Category memory newCategory = Category(_name,true);
		categorySet[num] = newCategory;
		emit functionState("upLoadCategory",true,"uploadCategory success");
	}

	function getCategoryName(uint256 _serialNum) public view returns(string memory){	
		require(_serialNum<=num,"Invalid serialNum");
		require(categorySet[_serialNum].isUsed,"The category has been removed");
		return categorySet[_serialNum].name;
	}

	function isAvailable(uint256 _serialNum) public view returns(bool){
		return categorySet[_serialNum].isUsed;
	}

	function deleteCategory(uint256 _serialNum) public{	
		categorySet[_serialNum].isUsed = false;
		emit functionState("deleteCategory",true,"delete successfully");
	}


	//上传某一个数据对应的 model value
	function upLoadData(string memory _id,uint256 _cateNum,string memory _name,string memory _value)public{
		string memory cateString = uintToString(_cateNum);
		string memory joint = strConcat(_id,cateString);
		bytes32 res = stringToBytes32(joint);
		string memory index = keccak256(res);
		Model memory newModel = Model(_name,_value);
		data2Result[index].push(newModel);
		emit functionState("upLoadData",true,"upLoad successfully");
	}

	function getModels(string memory _id, uint256 _cateNum) public returns(uint256,Model[] memory){
		string memory cateString = uintToString(_cateNum);
		string memory joint = strConcat(_id,cateString);
		string memory index = keccak256(joint);
		return (data2Result[index].length,data2Result[index]);
	}

	//internal functions
	//uint256 -> string
    function uintToString(uint v) internal pure returns (string memory ret) {
    if (v == 0) {
        ret = '0';
    }
    else {
        while (v > 0) {
            ret = bytes32(uint(ret) / (2 ** 8));
            ret |= bytes32(((v % 10) + 48) * 2 ** (8 * 31));
            v /= 10;
        }
    }
    return string(ret);
}

    //字符串拼接
    function strConcat(string memory _a, string memory _b) internal returns (string memory){
        bytes memory _ba = bytes(_a);
        bytes memory _bb = bytes(_b);
        string memory ret = new string(_ba.length + _bb.length);
        bytes memory bret = bytes(ret);
        uint k = 0;
        for (uint256 i = 0; i < _ba.length; i++)bret[k++] = _ba[i];
        for (uint256 i = 0; i < _bb.length; i++) bret[k++] = _bb[i];
        return string(ret);
   }  
   
    // string类型转化为bytes32型转
    function stringToBytes32(string memory source) internal pure returns(bytes32 result){
        assembly{
            result := mload(add(source,32))
        }
    }

}
