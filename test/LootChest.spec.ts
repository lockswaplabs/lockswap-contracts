import chai, { expect } from 'chai'
import { Contract } from 'ethers'
import { solidity, MockProvider, deployContract } from 'ethereum-waffle'

import { deployGovernanceToken } from './shared/deploy'

import LootChest from '../build/LootChest.json'

chai.use(solidity)

describe('LootChest', () => {
  const provider = new MockProvider({
    hardfork: 'istanbul',
    mnemonic: 'horn horn horn horn horn horn horn horn horn horn horn horn',
    gasLimit: 9999999
  })
  const [alice, bob, carol] = provider.getWallets()

  let govToken: Contract
  let lootChest: Contract

  beforeEach(async () => {
    govToken = await deployGovernanceToken(alice)
    
    await govToken.mint(alice.address, "100")
    await govToken.mint(bob.address, "100")
    await govToken.mint(carol.address, "100")

    lootChest = await deployContract(alice, LootChest, ["LootChest", "aLOOT", govToken.address])
  })

  it('should have correct values for: name, symbol, decimals, totalSupply, balanceOf', async () => {
    const name = await lootChest.name()
    expect(name).to.eq('LootChest')
    expect(await lootChest.symbol()).to.eq('aLOOT')
    expect(await lootChest.decimals()).to.eq(18)
    expect(await lootChest.totalSupply()).to.eq(0)
    expect(await lootChest.balanceOf(alice.address)).to.eq(0)
  })

  it("should not allow enter if not enough approve", async function () {
    await expect(lootChest.enter("100")).to.be.revertedWith("ERC20: transfer amount exceeds allowance")
    await govToken.approve(lootChest.address, "50")
    await expect(lootChest.enter("100")).to.be.revertedWith("ERC20: transfer amount exceeds allowance")
    await govToken.approve(lootChest.address, "100")
    await lootChest.enter("100")
    expect(await lootChest.balanceOf(alice.address)).to.equal("100")
  })

  it("should not allow withraw more than what you have", async function () {
    await govToken.approve(lootChest.address, "100")
    await lootChest.enter("100")
    await expect(lootChest.leave("200")).to.be.revertedWith("ERC20: burn amount exceeds balance")
  })

  it("should work with more than one participant", async function () {
    await govToken.approve(lootChest.address, "100")
    await govToken.connect(bob).approve(lootChest.address, "100")
    // Alice enters and gets 20 shares. Bob enters and gets 10 shares.
    await lootChest.enter("20")
    await lootChest.connect(bob).enter("10")
    expect(await lootChest.balanceOf(alice.address)).to.equal("20")
    expect(await lootChest.balanceOf(bob.address)).to.equal("10")
    expect(await govToken.balanceOf(lootChest.address)).to.equal("30")
    // LootChest get 20 more LOOTs from an external source.
    await govToken.connect(carol).transfer(lootChest.address, "20")
    // Alice deposits 10 more LOOTs. She should receive 10*30/50 = 6 shares.
    await lootChest.enter("10")
    expect(await lootChest.balanceOf(alice.address)).to.equal("26")
    expect(await lootChest.balanceOf(bob.address)).to.equal("10")
    // Bob withdraws 5 shares. He should receive 5*60/36 = 8 shares
    await lootChest.connect(bob).leave("5")
    expect(await lootChest.balanceOf(alice.address)).to.equal("26")
    expect(await lootChest.balanceOf(bob.address)).to.equal("5")
    expect(await govToken.balanceOf(lootChest.address)).to.equal("52")
    expect(await govToken.balanceOf(alice.address)).to.equal("70")
    expect(await govToken.balanceOf(bob.address)).to.equal("98")
  })

})
