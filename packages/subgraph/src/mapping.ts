import { BigInt } from "@graphprotocol/graph-ts"
import {
  ChainAIV2,
  JobCreated,
} from "../generated/ChainAIV2/ChainAIV2"
import { Job } from "../generated/schema"

export function handleJobCreated(event: JobCreated): void {
  let job = new Job(event.params.jobId.toString())
  job.modelCategory = event.params.modelCategory
  job.seed = event.params.seed
  job.modelConfigLocation = event.params.modelConfigLocation
  job.inputDataLocationType = event.params.inputDataLocationType
  job.input = event.params.input
  job.outputDataLocationType = event.params.outputDataLocationType
  job.outputDataFormat = event.params.outputDataFormat
  job.createdTimestamp = event.params.createdTimestamp
  job.save()

  // Note: If a handler doesn't require existing field values, it is faster
  // _not_ to load the entity from the store. Instead, create it fresh with
  // `new Entity(...)`, set the fields that should be updated and save the
  // entity back to the store. Fields that were not set or unset remain
  // unchanged, allowing for partial updates to be applied.

  // It is also possible to access smart contracts from mappings. For
  // example, the contract that has emitted the event can be connected to
  // with:
  //
  // let contract = Contract.bind(event.address)
  //
  // The following functions can then be called on this contract to access
  // state variables and other data:
  //
  // - contract.inferencePrice(...)
  // - contract.jobs(...)
  // - contract.sequencers(...)
}
