//localSave.setItem("apiPrefix", "https://testnet.nebulas.io");

localSave.setItem("apiPrefix", "https://mainnet.nebulas.io");

var contract_addr = "n1jKn1gSyW3jm64TkQ22iMSgc4xxxFkCfCx";


$("#submit-btn").on("click", onSubmit);

$("#submit-confirm-btn").on("click", onRealSubmit);


function onReset() {
    var seed = parseInt($("#seed").val());
    G.reset(NNN * NNN, seed);
    console.log("reset");
}

function onRandReset() {
    var i;
    var f = 1;
    for (i = 1; i <= NNN * NNN; i++) {
        f *= i;
    }
    var seed = Math.floor(f * Math.random());
    $("#seed").val(seed);
    onReset();
}


window.addEventListener('message', function (e) {
    console.log("message received, msg.data: " + JSON.stringify(e.data));
    if (!!e.data.data.txhash) {
        if ($(".modal.tips").is(':visible')) {
            $(".modal.tips").modal('toggle');
        }
        console.log("交易哈希：" + JSON.stringify(e.data.data.txhash, null, '\t'));
    }
});



if (localSave.getItem("apiPrefix").includes('test')) {
    $(".net-type").text("(测试网)");
} else {
    $(".net-type").text("(主网)");
}


function make_params(arg_list) {
    var res = "[";
    for (var i = 0; i < arg_list.length; i++) {
        if (typeof (arg_list[i]) != 'number') {
            res = res + "\"";
            res = res + arg_list[i];
            res = res + "\"";
        } else {
            res = res + arg_list[i];
        }
        if (i != arg_list.length - 1) {
            res = res + ",";
        }
    }
    res = res + "]";
    return res;
}

function refresh() {
    get_all(process_list);
    get_some(process_list);
}


document.addEventListener("DOMContentLoaded", function () {
    // Wait till the browser is ready to render the game (avoids glitches)
    window.requestAnimationFrame(function () {
        refresh();

        var x = setInterval(function () {
            refresh();
        }, 15000);


        if (window.webExtensionWallet == null) {
            $("#submit-btn").hide();
            $(".no-wallet").html(
                "<p> <br/>  快来安装<a href='https://github.com/ChengOrangeJu/WebExtensionWallet' target='_blank'>星云官方钱包插件</a>，上传您的成绩！ :) </p>"
            );
        }


    });
});


function process_list(list, table) {
    var map = {};
    var scores = [];
    var sortedList = [];

    for (var i = 0; i < list.length; i++) {
        map[list[i][3]] = list[i];
        scores.push(list[i][3]);
    }

    scores.sort(function (a, b) {
        return b - a
    });

    for (var i = 0; i < scores.length; i++) {
        sortedList.push(map[scores[i]]);
    }

    var str = "";

    str += "<tr>" + "<th>address</th>" + "<th>score</th>" + "<th>seed</th>" + "</tr>"
    for (var i = 0; i < sortedList.length; i++) {
        var x = sortedList[i];
        var k = x[0];
        var from = x[2];
        var seed = x[1];
        var score = x[3]

        str += "<tr>" + "<td>" + "<a target='_blank' href=https://explorer.nebulas.io/#/address/" + from + ">" +
            from + "</a></td>" + " <td> " + score + " </td> " + "<td>" + seed + "</td>" + "</tr>";
    }

    $(table).html(str);

}

function get_all(callback) {
    var _to_addr = contract_addr;
    var _value = '0';
    var _args = make_params([G.K]);

    inner_call(_to_addr, _value, "fetch_all", _args, function (resp) {
        console.log(resp);
        var list = JSON.parse(JSON.parse(resp['result']));
        callback(list, "#rank1");
    });
}

function get_some(callback) {
    var _to_addr = contract_addr;
    var _value = '0';
    var _args = make_params([G.K, G.seed]);

    inner_call(_to_addr, _value, "fetch_some", _args, function (resp) {
        var list = JSON.parse(JSON.parse(resp['result']));
        callback(list, "#rank2");
    });
}

function onSubmit() {
    var _to_addr = contract_addr;
    var _value = '0';
    var _args = make_params([G.K, G.seed, G.moves]);

    inner_call(_to_addr, _value, "addRecord", _args, function (resp) {
        if (G.state != 1) {
            alert("游戏尚未结束，得分无法提交。")
            return;
        }

        $(".modal.tips").modal('toggle');
        console.log(resp);
        var gaslimit = resp['estimate_gas'];
        $("#gaslimit").text(Math.max(gaslimit * 100, 200000000));
    });
}

function onRealSubmit() {

    var _to_addr = contract_addr;
    var _value = '0';
    var _args = make_params([G.K, G.seed, G.moves]);

    sendTx(_to_addr, _value, "addRecord", _args);
}


function sendTx(_to_addr, _value, _func, _args) {
    window.postMessage({
        "target": "contentscript",
        "data": {
            "to": _to_addr,
            "value": _value.toString(),
            "contract": {
                "function": _func,
                "args": _args
            }
        },
        "method": "neb_sendTransaction",
    }, "*");
}


function inner_call(_to_addr, _value, _func, _args, callback) {
    var url = 'https://mainnet.nebulas.io/v1/user/call';
    var from = 'n1YeD6SCiSNxjQ1CEUhSpThNxPU77mvB1sp';


    if (localSave.getItem("apiPrefix").includes('test')) {
        url = 'https://testnet.nebulas.io/v1/user/call';
        from = 'n1cNkcUumVmt6CHjYhgTECZHnm3nGDzkWfx';
    }


    var contract = _to_addr;

    var requestObj = {
        from: from,
        to: contract,
        value: _value,
        nonce: 111112888,
        gasPrice: '1000000',
        gasLimit: '200000000',
        contract: {
            function: _func,
            args: _args
        }
    };

    fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestObj)
        })
        .then(res => res.json())
        .then(res => {
            callback(res['result']);
        });
}