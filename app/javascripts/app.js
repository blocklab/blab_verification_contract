window.onload = function() {
  web3.eth.getAccounts(function(err, accs) {
    if (err != null) {
      alert("There was an error fetching your accounts.");
      return;
    }

    if (accs.length == 0) {
      alert("Couldn't get any accounts! Make sure your Ethereum client is configured correctly.");
      return;
    }

    document.getElementById('accounts').innerHTML = accs;
    document.getElementById('contract-address').innerHTML = Verification.deployed().address;
    document.getElementById('contract-abi').innerHTML = JSON.stringify(Verification.deployed().abi);
  });
};
