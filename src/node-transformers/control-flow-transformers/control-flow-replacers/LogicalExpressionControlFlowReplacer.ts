import { injectable, inject } from 'inversify';
import { ServiceIdentifiers } from '../../../container/ServiceIdentifiers';

import * as ESTree from 'estree';

import { TControlFlowCustomNodeFactory } from '../../../types/container/custom-nodes/TControlFlowCustomNodeFactory';

import { ICustomNode } from '../../../interfaces/custom-nodes/ICustomNode';
import { IOptions } from '../../../interfaces/options/IOptions';
import { IRandomGenerator } from '../../../interfaces/utils/IRandomGenerator';
import { IStorage } from '../../../interfaces/storages/IStorage';

import { ControlFlowCustomNode } from '../../../enums/custom-nodes/ControlFlowCustomNode';

import { ExpressionWithOperatorControlFlowReplacer } from './ExpressionWithOperatorControlFlowReplacer';
import { NodeGuards } from '../../../node/NodeGuards';
import { NodeUtils } from '../../../node/NodeUtils';

@injectable()
export class LogicalExpressionControlFlowReplacer extends ExpressionWithOperatorControlFlowReplacer {
    /**
     * @type {number}
     */
    private static readonly usingExistingIdentifierChance: number = 0.5;

    /**
     * @param {TControlFlowCustomNodeFactory} controlFlowCustomNodeFactory
     * @param {IRandomGenerator} randomGenerator
     * @param {IOptions} options
     */
    constructor (
        @inject(ServiceIdentifiers.Factory__IControlFlowCustomNode)
            controlFlowCustomNodeFactory: TControlFlowCustomNodeFactory,
        @inject(ServiceIdentifiers.IRandomGenerator) randomGenerator: IRandomGenerator,
        @inject(ServiceIdentifiers.IOptions) options: IOptions
    ) {
        super(controlFlowCustomNodeFactory, randomGenerator, options);
    }

    /**
     * @param {LogicalExpression} logicalExpressionNode
     * @param {NodeGuards} parentNode
     * @param {IStorage<ICustomNode>} controlFlowStorage
     * @returns {NodeGuards}
     */
    public replace (
        logicalExpressionNode: ESTree.LogicalExpression,
        parentNode: ESTree.Node,
        controlFlowStorage: IStorage <ICustomNode>
    ): ESTree.Node {
        if (this.checkForProhibitedExpressions(logicalExpressionNode.left, logicalExpressionNode.right)) {
            return logicalExpressionNode;
        }

        const replacerId: string = logicalExpressionNode.operator;
        const logicalExpressionFunctionCustomNode: ICustomNode = this.controlFlowCustomNodeFactory(
            ControlFlowCustomNode.LogicalExpressionFunctionNode
        );

        logicalExpressionFunctionCustomNode.initialize(replacerId);

        const storageKey: string = this.insertCustomNodeToControlFlowStorage(
            logicalExpressionFunctionCustomNode,
            controlFlowStorage,
            replacerId,
            LogicalExpressionControlFlowReplacer.usingExistingIdentifierChance
        );

        return this.getControlFlowStorageCallNode(
            controlFlowStorage.getStorageId(),
            storageKey,
            logicalExpressionNode.left,
            logicalExpressionNode.right
        );
    }

    /**
     * @param {Expression} leftExpression
     * @param {Expression} rightExpression
     * @returns {boolean}
     */
    private checkForProhibitedExpressions (leftExpression: ESTree.Expression, rightExpression: ESTree.Expression): boolean {
        return [leftExpression, rightExpression].some((expressionNode: ESTree.Node | ESTree.Expression): boolean => {
            let nodeForCheck: ESTree.Node | ESTree.Expression;

            if (!NodeGuards.isUnaryExpressionNode(expressionNode)) {
                nodeForCheck = expressionNode;
            } else {
                nodeForCheck = NodeUtils.getUnaryExpressionArgumentNode(expressionNode);
            }

            return !NodeGuards.isLiteralNode(nodeForCheck) &&
                !NodeGuards.isIdentifierNode(nodeForCheck) &&
                !NodeGuards.isObjectExpressionNode(nodeForCheck) &&
                !NodeGuards.isExpressionStatementNode(nodeForCheck);
        });
    }
}
