var idMap = {};
var userDevices = {};
var userData = {};
const socket = new WebSocket("ws://" + document.location.host, "echo-protocol");
var sevenDay = 7 * 24 * 60 * 60;
var oneDay = 1 * 24 * 60 * 60;
var last7Total = 0;
var balUSD;
var sidebarWidth = 0;
var last7initial = {};
var deviceBalance = {};
var deviceOverviewInitial;
var startDateVal;
var endDateVal;

for (var x = 0; x < 2; x++) {
  startDate[x].max = unixToYYYYMMDD(new Date().getTime());
  startDate[x].value = unixToYYYYMMDD(new Date().getTime() - sevenDay * 1000);
  endDate[x].max = unixToYYYYMMDD(new Date().getTime() + oneDay * 1000);
  endDate[x].value = unixToYYYYMMDD(new Date().getTime() + oneDay * 1000);
}
socket.addEventListener("error", function (event) {
  alert("websocket Error");
  console.log(event);
});
socket.addEventListener("open", function (event) {
  socket.send('{"action":"getbalance","echo":"balance"}');
  socket.send('{"action":"getstarttime","echo":"starttime"}');
  socket.send('{"action":"getidmap","echo":"idmap"}');
});
socket.addEventListener("message", function (event) {
  jsonData = JSON.parse(event.data);
  if (jsonData.echo == "balance") {
    if (
      jsonData.req.data.payout != undefined &&
      jsonData.req.data.payout.credits != undefined
    ) {
      currentBalance.innerText = jsonData.req.data.payout.credits;
      currentBalanceGB.innerText = (
        jsonData.req.data.payout.credits / 100
      ).toFixed(2);
    }
    if (
      jsonData.req.data.payout != undefined &&
      jsonData.req.data.payout.usd_cents != undefined
    ) {
      currentBalanceUSD.innerText = jsonData.req.data.payout.usd_cents / 100;
      balUSD = jsonData.req.data.payout.usd_cents / 100;
      calcNextPayout();
    }
  }
  if (jsonData.echo == "sevenday") {
    last7initial = jsonData.balance;
    socket.send('{"action":"getdevicebalance","time":"now","echo":"now"}');
  }
  if (jsonData.echo == "enddate") {
    deviceBalanceEnd = jsonData.balance;
    socket.send(
      '{"action":"getdevicebalance","starttime":' +
        new Date(startDateVal).getTime() / 1000 +
        ',"echo":"deviceoverview"}'
    );
  }
  if (jsonData.echo == "now") {
    deviceBalance = jsonData.balance;
    for (x in last7initial) {
      last7Total += deviceBalance[x].credits - last7initial[x];
      last7Balance.innerText = last7Total.toFixed(2);
      last7BalanceUSD.innerText = (last7Total / 1000).toFixed(2);
      last7BalanceGB.innerText = (last7Total / 100).toFixed(2);
      last7Rate.innerText = (last7Total / 1000 / 7).toFixed(2);
    }
    calcNextPayout();
  }
  if (jsonData.echo == "deviceoverview") {
    deviceOverviewInitial = jsonData.balance;
    updateTables();
  }
  if (jsonData.echo == "starttime") {
    startDate[0].min = unixToYYYYMMDD(jsonData.time * 1000);
    startDate[1].min = unixToYYYYMMDD(jsonData.time * 1000);
    endDate[0].min = unixToYYYYMMDD(jsonData.time * 1000);
    endDate[1].min = unixToYYYYMMDD(jsonData.time * 1000);
  }
  if (jsonData.echo == "idmap") {
    idMap = jsonData.idmap;
    socket.send(
      '{"action":"getdevicebalance","starttime":' +
        (new Date().getTime() / 1000 - sevenDay) +
        ',"echo":"sevenday"}'
    );
  }
  console.log("message: ", jsonData);
});
function updateTables() {
  userDevices = {};
  userData = {};
  var hgactiveDevicesNum = 0;
  var activeDevicesNum = 0;
  var earningDevicesNum = 0;
  var earningsTotal = 0;
  var len = deviceoverviewTable.rows.length - 1;
  var len2 = useroverviewTable.rows.length - 1;
  for (var x = 0; x < len; x++) {
    deviceoverviewTable.deleteRow(1);
  }
  for (var x = 0; x < len2; x++) {
    useroverviewTable.deleteRow(1);
  }
  var rowCount = 0;
  for (var id in deviceOverviewInitial) {
    rowCount++;
    var earningDevice = false;
    hgactiveDevicesNum++;
    try {
      last7Total += deviceBalanceEnd[id].credits - deviceOverviewInitial[id];
    } catch (e) {
      deviceBalanceEnd[id] = { credits: deviceOverviewInitial[id] };
    }
    //device earning
    if (deviceBalanceEnd[id].credits != deviceOverviewInitial[id]) {
      earningsTotal += deviceBalanceEnd[id].credits - deviceOverviewInitial[id];
      earningDevicesNum++;
      earningDevice = true;
    }

    var username = id;
    if (idMap[id] != undefined) {
      username = decodeURI(idMap[id].title);
    }
    var deviceRow = deviceoverviewTable.insertRow(rowCount);

    var userCell = deviceRow.insertCell(0);
    userCell.innerText = username;

    var deviceCell = deviceRow.insertCell(1);

    var creditsGainedCell = deviceRow.insertCell(2);
    creditsGainedCell.innerText = (
      deviceBalanceEnd[id].credits - deviceOverviewInitial[id]
    ).toFixed(2);

    var totalCreditsCell = deviceRow.insertCell(3);
    totalCreditsCell.innerText ="$"+deviceBalanceEnd[id].credits.toFixed(2);

    var balanceGainedCell = deviceRow.insertCell(4);
    balanceGainedCell.innerText = "$"+(
      (deviceBalanceEnd[id].credits - deviceOverviewInitial[id]) /
      1000
    ).toFixed(2);

    var totalBalanceCell = deviceRow.insertCell(5);
    totalBalanceCell.innerText = "$"+(deviceBalanceEnd[id].credits / 1000).toFixed(
      2
    );

    var lastEarningCell = deviceRow.insertCell(6);

    var tSplit = username.split("*");
    var thisLastEarning = (
      (new Date().getTime() / 1000 - deviceBalance[id].lastEarning) /
      3600
    ).toFixed(1);

    if (tSplit[0].charAt(0) == "#" && tSplit.length == 3) {
      console.log(true);
      //follows the pool format: #<user>*<device>*
      username = tSplit[0].substr(1);
      userCell.innerText = username;
      deviceCell.innerText = tSplit[1];
      if (userDevices[username] == undefined) {
        //create user
        userDevices[username] = [];
        userData[username] = {
          deviceCount: 0,
          earningDeviceCount: 0,
          activeDeviceCount: 0,
          creditsEarned: 0,
          totalCredits: 0,
        };
      }
      //update user stats
      userData[username].deviceCount++;
      userData[username].earningDeviceCount += earningDevice ? 1 : 0;
      userData[username].creditsEarned =
        deviceBalanceEnd[id].credits -
        deviceOverviewInitial[id] +
        parseFloat(userData[tSplit[0].substr(1)].creditsEarned);
      userData[username].totalCredits += deviceBalanceEnd[id].credits;
      userData[username].activeDeviceCount += thisLastEarning >= 24 ? 0 : 1;
      userDevices[username].push({
        //push device into user
        id: id,
        device: tSplit[1],
        creditsEarned: (
          deviceBalanceEnd[id] - deviceOverviewInitial[id]
        ).toFixed(2),
        totalCredits: deviceBalanceEnd[id],
      });
    } //end follows the pool format: #<user>*<device>*
    lastEarningCell.innerText = thisLastEarning;
    lastEarningCell.style =
      thisLastEarning >= 24 ? "background-color: #ff0000;" : "";
    //display mode hide not earning
    if (
      deviceDisplayMode.selectedIndex == 3 &&
      (deviceBalanceEnd[id].credits - deviceOverviewInitial[id]).toFixed(2) == 0
    ) {
      row.style = "display:none;";
    }
    //device inactive
    if (thisLastEarning >= 24) {
      if (deviceDisplayMode.selectedIndex == 1) {
        //display mode hide inactive
        row.style = "display:none;";
      }
    } else {
      if (deviceDisplayMode.selectedIndex == 2) {
        //display mode only show inactive
        row.style = "display:none;";
      }
      activeDevicesNum++;
    }
  }

  //overview card
  earningPerDevice.innerText = (
    earningsTotal /
    earningDevicesNum /
    1000
  ).toFixed(3);
  hgactiveDevices.innerText = hgactiveDevicesNum;
  activeDevices.innerText = activeDevicesNum;
  earningDevices.innerText = earningDevicesNum;

  var earningUserNum = 0;
  var hgActiveUsersNum = 0;
  for (x in userData) {
    hgActiveUsersNum++;
    var userRow = useroverviewTable.insertRow(1);
    userRow.insertCell(0).innerText = x;
    userRow.insertCell(1).innerText = userData[x].deviceCount;
    userRow.insertCell(2).innerText = userData[x].earningDeviceCount;
    userRow.insertCell(3).innerText = userData[x].activeDeviceCount;
    userRow.insertCell(4).innerText = userData[x].creditsEarned.toFixed(2);
    userRow.insertCell(5).innerText = userData[x].totalCredits.toFixed(2);
    userRow.insertCell(6).innerText = "$"+(userData[x].creditsEarned/1000).toFixed(2);
    userRow.insertCell(7).innerText = "$"+(userData[x].totalCredits/1000).toFixed(2);
    earningUserNum += userData[x].earningDeviceCount > 0 ? 1 : 0;
  }
  //overview card
  hgActiveUsers.innerText = hgActiveUsersNum;
  earningUsers.innerText = earningUserNum;
  earningPerUser.innerText = (earningsTotal / earningUserNum / 1000).toFixed(3);
  sortTable(
    deviceoverviewTable,
    2,
    true,
    "Credits Gained",
    deviceCreditsGained
  );
  sortTable(useroverviewTable, 4, true, "Credits Gained", userCreditsGained);
}
function calcNextPayout() {
  if (balUSD > 0 && last7Total > 0) {
    nextPayout.innerText = Math.max(
      ((7 / (last7Total / 1000)) * (20 - balUSD)).toFixed(2),
      0
    );
    startDate[0].onchange();
  }
}

window.onhashchange = function () {
  switch (document.location.hash.replace("#", "")) {
    case "overview":
      closeSidebar();
      overviewPage.style.visibility = "visible";
      graphPage.style.visibility = "hidden";
      devicesPage.style.visibility = "hidden";
      usersPage.style.visibility = "hidden";
      pagelable.innerText = "Overview";
      break;
    case "sidebar":
      openSidebar();
      break;
    case "devices":
      closeSidebar();
      overviewPage.style.visibility = "hidden";
      graphPage.style.visibility = "hidden";
      devicesPage.style.visibility = "visible";
      usersPage.style.visibility = "hidden";
      pagelable.innerText = "Devices";
      break;
    case "graph":
      closeSidebar();
      overviewPage.style.visibility = "hidden";
      graphPage.style.visibility = "visible";
      devicesPage.style.visibility = "hidden";
      usersPage.style.visibility = "hidden";
      pagelable.innerText = "Graph";
      break;
    case "users":
      closeSidebar();
      overviewPage.style.visibility = "hidden";
      graphPage.style.visibility = "hidden";
      devicesPage.style.visibility = "hidden";
      usersPage.style.visibility = "visible";
      pagelable.innerText = "Graph";
      break;
    default:
      document.location.hash = "overview";
      break;
  }
};

function onDateChange(sdate, edate) {
  startDateVal = sdate;
  endDateVal = edate;
  startDate[0].value = startDateVal;
  startDate[1].value = startDateVal;
  endDate[0].value = endDateVal;
  endDate[1].value = endDateVal;
  socket.send(
    '{"action":"getdevicebalance","endtime":' +
      new Date(endDateVal).getTime() / 1000 +
      ',"echo":"enddate"}'
  );
  activeDevices.innerText = "Loaging...";
  earningDevices.innerText = "Loaging...";
  console.log("onchange");
}
window.onhashchange();
