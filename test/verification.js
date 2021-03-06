var Verification = artifacts.require('./Verification.sol')
var Token = artifacts.require('./Token.sol')
var Membership = artifacts.require('./Membership.sol')

contract('Verification', accounts => {
  let verificationContract
  let tokenContract
  let membershipContract
  let ALICE_THE_MEMBERMANAGER = accounts[0]
  let BOB_THE_MEMBER = accounts[1]
  let CAROL_THE_MEMBER = accounts[2]
  let NERO_THE_NONMEMBER = accounts[3]

  let verify = (reportId, account) => {
    return verificationContract.verify(reportId, {from: account})
  }

  let isValid = (reportId) => {
    return verificationContract.isValid.call(reportId)
  }

  let verifiersFor = (reportId) => {
    return verificationContract.verifiersFor.call(reportId)
  }

  let submitWithCustomCompensation = (reportId, compensation, account) => {
    return verificationContract.submit(reportId, compensation, {from: account})
  }

  let submit = (reportId, account) => {
    return verificationContract.submit(reportId, 100, {from: account})
  }

  beforeEach(() => {
    return Verification.deployed().then(instance => {
      verificationContract = instance
    }).then(() => {
      return verificationContract.membership.call()
    }).then(membershipContractAddress => {
      membershipContract = web3.eth.contract(Membership.abi).at(membershipContractAddress)
      return membershipContract.addMember(BOB_THE_MEMBER, {from: ALICE_THE_MEMBERMANAGER})
    }).then(() => {
      return membershipContract.addMember(CAROL_THE_MEMBER, {from: ALICE_THE_MEMBERMANAGER})
    }).then(() => {
      return verificationContract.token.call()
    }).then(tokenContractAddress => {
      tokenContract = web3.eth.contract(Token.abi).at(tokenContractAddress)
      return verificationContract.membership.call()
    })
  })

  describe('setup', () => {
    it('knows the connected membership contract address', () => {
      return verificationContract.membership.call().then(membershipAddress => {
        assert.isTrue(membershipAddress.length === 42)
      })
    })

    it('knows the connected token contract address', () => {
      return verificationContract.token.call().then(tokenAddress => {
        assert.equal(tokenAddress, tokenContract.address)
      })
    })

    it('is owner of the token contract', () => {
      return tokenContract.owner.call((err, ownerAddress) => {
        assert.equal(ownerAddress, verificationContract.address)
      })
    })
  })

  describe('submitting a report', () => {
    const report = 'DOCUMENT_HASH_0'

    it('sets the submitter in the report', () => {
      return submit(report, ALICE_THE_MEMBERMANAGER).then(() => {
        return verificationContract.submitterFor.call(report)
      }).then((submitter) => {
        assert.equal(submitter, ALICE_THE_MEMBERMANAGER)
      })
    })

    it('is not allowed to submit the same report twice', done => {
      submit(report, ALICE_THE_MEMBERMANAGER).catch(() => {
        assert.ok(true)
        done()
      }).then(() => {
        assert.fail()
        done()
      })
    })

    it('is not allowed for nonmembers', done => {
      submit('NONMEMBER_REPORT', NERO_THE_NONMEMBER).catch(() => {
        assert.ok(true)
        done()
      }).then(() => {
        assert.fail()
        done()
      })
    })
  })

  describe('verifying documents', () => {
    it('allows users to verify documents', () => {
      return submit('DOCUMENT_HASH', ALICE_THE_MEMBERMANAGER).then(() => {
        return verifiersFor('DOCUMENT_HASH')
      }).then(verifiers => {
        assert.equal(verifiers.length, 0)
        assert.sameDeepMembers(verifiers, [])
      })
    })
  })

  it('lists a document as valid after two verifications', () => {
    return submit('2ND_DOCUMENT_HASH', ALICE_THE_MEMBERMANAGER).then(() => {
      return verify('2ND_DOCUMENT_HASH', BOB_THE_MEMBER)
    }).then(() => {
      return verify('2ND_DOCUMENT_HASH', CAROL_THE_MEMBER)
    }).then(() => {
      return isValid('2ND_DOCUMENT_HASH')
    }).then(contractIsValid => {
      assert.isTrue(contractIsValid)
    })
  })

  it('cannot be verified by the same person twice', () => {
    return submit('3ND_DOCUMENT_HASH', ALICE_THE_MEMBERMANAGER).then(() => {
      return verify('3ND_DOCUMENT_HASH', BOB_THE_MEMBER)
    }).then(() => {
      return verify('3ND_DOCUMENT_HASH', BOB_THE_MEMBER)
    }).then(() => {
      return verifiersFor('3ND_DOCUMENT_HASH')
    }).then((verifiers) => {
      assert.equal(verifiers.length, 1)
    })
  })

  it('is not possible for a nonmember to verify a report', done => {
    submit('4TH_DOCUMENT_HASH', ALICE_THE_MEMBERMANAGER).then(() => {
      return verify('4TH_DOCUMENT_HASH', NERO_THE_NONMEMBER);
    }).catch(() => {
      done()
    }).then(() => {
      assert.fail()
      done()
    })
  })

  it('is not possible to verify an unsubmitted report', done => {
    verify('5ND_DOCUMENT_HASH', ALICE_THE_MEMBERMANAGER)
      .catch(() => {
        assert.ok(true)
        done()
      }).then(() => {
      assert.fail()
      done()
    })
  })

  it('provides the amount of tokens the submitter chose after its fully verified', (done) => {
    const CHOSEN_COMPENSATION = 200;
    submitWithCustomCompensation('WORK_DONE', CHOSEN_COMPENSATION, BOB_THE_MEMBER).then(() => {
      return verify('WORK_DONE', ALICE_THE_MEMBERMANAGER)
    }).then(() => {
      return verify('WORK_DONE', CAROL_THE_MEMBER)
    }).then(() => {
      tokenContract.getBalance.call(BOB_THE_MEMBER, (err, bobsTokenAmount) => {
        assert.equal(bobsTokenAmount.valueOf(), CHOSEN_COMPENSATION)
        done()
      })
    })
  })
})
