class AssemblerError extends Error {
    constructor(message, horizPos) {
        super(message);
        this.horizPos = horizPos;
    }
}

export class InvalidOpcodeError extends AssemblerError {
    constructor(horizPos, invalidOpcode) {
        super(`Invalid Opcode: "${invalidOpcode}"`, horizPos);
    }
}

export class OperandSizeError extends AssemblerError {
    constructor(horizPos, expectedNumOperands, receivedNumOperands) {
        if (receivedNumOperands > expectedNumOperands) {
            super(`Too many Operands! Expected ${expectedNumOperands} but read ${receivedNumOperands}`, horizPos);
        }
        else if (receivedNumOperands < expectedNumOperands) {
            super(`Not enough Operands! Expected ${expectedNumOperands} but read ${receivedNumOperands}`, horizPos);
        }
        else super('Unknown operand size error', horizPos);
    }
}

export class ImmOutRangeError extends AssemblerError {
    constructor(horizPos, minVal, maxVal) {
        super(`Immediate Operand Invalid! Value must be between ${minVal} and ${maxVal}`, horizPos);
    }
}

export class InvalidInputError extends AssemblerError {
    constructor(horizPos, expectedFormat) {
        super(`Input invalid! Expected ${expectedFormat}`, horizPos);
    }
}
