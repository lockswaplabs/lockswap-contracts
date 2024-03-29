import chai, { expect } from 'chai'
import { Contract } from 'ethers'
import { solidity, MockProvider, deployContract } from 'ethereum-waffle'

import { expandTo18Decimals } from '../shared/utilities'

import { deployMasterLooter, deployGovernanceToken } from '../shared/deploy'

chai.use(solidity)

const REWARDS_PER_BLOCK = expandTo18Decimals(1000)
const REWARDS_START_BLOCK = 0
const HALVING_AFTER_BLOCK_COUNT = 45360

describe('MasterLooter::Authorization', () => {
  const provider = new MockProvider({
    hardfork: 'istanbul',
    mnemonic: 'horn horn horn horn horn horn horn horn horn horn horn horn',
    gasLimit: 9999999
  })
  const wallets = provider.getWallets()
  const [alice, bob, carol, minter, dev, liquidityFund, communityFund, founderFund] = wallets

  let govToken: Contract
  let looter: Contract
  
  beforeEach(async () => {
    govToken = await deployGovernanceToken(alice)
    // 1000 LOOT per block, rewards start at block 0, rewards are halved after every 45360 blocks
    looter = await deployMasterLooter(wallets, govToken, REWARDS_PER_BLOCK, REWARDS_START_BLOCK, HALVING_AFTER_BLOCK_COUNT)
  })

  it("should allow the owner to reclaim ownership of the Loot token", async function () {
    expect(await govToken.transferOwnership(looter.address))

    expect(await govToken.owner()).to.be.equal(looter.address)

    await expect(looter.reclaimTokenOwnership(alice.address))
      .to.emit(govToken, 'OwnershipTransferred')
      .withArgs(looter.address, alice.address)
    
    expect(await govToken.owner()).to.be.equal(alice.address)
  })

  it("should allow authorized users to reclaim ownership of the Loot token", async function () {
    await looter.addAuthorized(bob.address)

    expect(await govToken.transferOwnership(looter.address))

    expect(await govToken.owner()).to.be.equal(looter.address)

    await expect(looter.connect(bob).reclaimTokenOwnership(bob.address))
      .to.emit(govToken, 'OwnershipTransferred')
      .withArgs(looter.address, bob.address)
    
    expect(await govToken.owner()).to.be.equal(bob.address)
  })

  it("unauthorized users shouldn't be able to reclaim ownership of the token back from MasterChef", async function () {
    expect(await govToken.transferOwnership(looter.address))
    expect(await govToken.owner()).to.be.equal(looter.address)

    await expect(looter.connect(bob).reclaimTokenOwnership(bob.address)).to.be.reverted
    
    expect(await govToken.owner()).to.be.equal(looter.address)
  })

  it("should allow only authorized users to update the developer rewards address", async function () {
    expect(await looter.devaddr()).to.equal(dev.address)

    await expect(looter.connect(bob).dev(bob.address)).to.be.reverted

    await looter.addAuthorized(dev.address)
    await looter.connect(dev).dev(bob.address)
    expect(await looter.devaddr()).to.equal(bob.address)

    await looter.addAuthorized(bob.address)
    await looter.connect(bob).dev(alice.address)
    expect(await looter.devaddr()).to.equal(alice.address)
  })

  it("should allow only authorized users to update the liquidity provider rewards address", async function () {
    expect(await looter.liquidityaddr()).to.equal(liquidityFund.address)

    await expect(looter.connect(bob).lpUpdate(bob.address)).to.be.reverted

    await looter.addAuthorized(liquidityFund.address)
    await looter.connect(liquidityFund).lpUpdate(bob.address)
    expect(await looter.liquidityaddr()).to.equal(bob.address)

    await looter.addAuthorized(bob.address)
    await looter.connect(bob).lpUpdate(alice.address)
    expect(await looter.liquidityaddr()).to.equal(alice.address)
  })

  it("should allow only authorized users to update the community fund rewards address", async function () {
    expect(await looter.comfundaddr()).to.equal(communityFund.address)

    await expect(looter.connect(bob).comUpdate(bob.address)).to.be.reverted

    await looter.addAuthorized(communityFund.address)
    await looter.connect(communityFund).comUpdate(bob.address)
    expect(await looter.comfundaddr()).to.equal(bob.address)

    await looter.addAuthorized(bob.address)
    await looter.connect(bob).comUpdate(alice.address)
    expect(await looter.comfundaddr()).to.equal(alice.address)
  })

  it("should allow only authorized users to update the founder rewards address", async function () {
    expect(await looter.founderaddr()).to.equal(founderFund.address)

    await expect(looter.connect(bob).founderUpdate(bob.address)).to.be.reverted

    await looter.addAuthorized(founderFund.address)
    await looter.connect(founderFund).founderUpdate(bob.address)
    expect(await looter.founderaddr()).to.equal(bob.address)

    await looter.addAuthorized(bob.address)
    await looter.connect(bob).founderUpdate(alice.address)
    expect(await looter.founderaddr()).to.equal(alice.address)
  })
})
