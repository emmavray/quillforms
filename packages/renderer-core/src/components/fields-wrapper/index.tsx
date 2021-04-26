/* eslint-disable no-nested-ternary */
/**
 * QuillForms Dependencies
 */
import { FormBlocks } from '@quillforms/config';

/**
 * Wordpress Dependencies
 */
import { useSelect, useDispatch } from '@wordpress/data';
import { useEffect, useState, useRef } from '@wordpress/element';

/**
 * External Dependencies
 */
import { forEach, size } from 'lodash';
import { Lethargy } from 'lethargy';

/**
 * Internal Dependencies
 */
import FieldRender from '../field-render';
import useLogic from '../../hooks/use-logic';
import useBlocks from '../../hooks/use-blocks';

let lastScrollDate = 0;
const lethargy = new Lethargy();

interface Props {
	applyLogic: boolean;
}

const FieldsWrapper: React.FC< Props > = ( { applyLogic } ) => {
	const jumpLogic = useLogic();
	const blocks = useBlocks();
	const [ isFocused, setIsFocused ] = useState< boolean >( false );
	const ref = useRef< HTMLDivElement | null >( null );
	const { swiper } = useSelect( ( select ) => {
		return {
			swiper: select( 'quillForms/renderer-core' ).getSwiperState(),
		};
	} );

	const {
		walkPath,
		currentBlockId,
		nextBlockId,
		prevBlockId,
		lastActiveBlockId,
		canGoNext,
		canGoPrev,
		isAnimating,
	} = swiper;

	const getFieldsToRender = (): string[] => {
		const fieldIds: string[] = [];
		const filteredBlocks = walkPath.filter(
			( block ) =>
				block.id === currentBlockId ||
				block.id === nextBlockId ||
				block.id === prevBlockId ||
				block.id === lastActiveBlockId
		);
		filteredBlocks.forEach( ( block ) => {
			if (
				block.name !== 'welcome-screen' &&
				block.name !== 'thankyou-screen'
			) {
				fieldIds.push( block.id );
			}
		} );
		return fieldIds;
	};

	const fieldsToRender = getFieldsToRender();
	const fields = blocks.filter(
		( block ) =>
			block.name !== 'welcome-screen' && block.name !== 'thankyou-screen'
	);

	const { setSwiper, goNext, goPrev } = useDispatch(
		'quillForms/renderer-core'
	);

	const isFirstField =
		walkPath?.length > 0 && walkPath[ 0 ].id === currentBlockId;

	const isLastField =
		walkPath?.length &&
		currentBlockId === walkPath[ walkPath.length - 1 ].id;

	// Mouse Wheel Handler
	const swipingHandler = ( e: React.WheelEvent ) => {
		if ( swiper.isAnimating ) return;
		const lethargyCheck = lethargy.check( e );
		const now = new Date().getTime();
		if (
			lethargyCheck === false ||
			isAnimating ||
			( lastScrollDate && now - lastScrollDate < 750 )
		)
			return;
		if (
			canGoPrev &&
			lethargyCheck === 1 &&
			e.deltaY < -50 &&
			! isFirstField
		) {
			// Scroll up
			lastScrollDate = new Date().getTime();
			goPrev();
		} else if (
			canGoNext &&
			lethargyCheck === -1 &&
			e.deltaY > 50 &&
			! isLastField
		) {
			lastScrollDate = new Date().getTime();
			// Scroll down
			goNext();
		}
	};

	useEffect( (): void | ( () => void ) => {
		if ( isAnimating ) {
			const timer = setTimeout( () => {
				setSwiper( {
					isAnimating: false,
				} );
			}, 600 );
			return () => clearTimeout( timer );
		}
	}, [ swiper ] );

	// const currentBlock = blocks.find(
	// 	( block ) => block.id === currentBlockId
	// );
	// const { isCurrentBlockEditable } = useSelect( ( select ) => {
	// 	return {
	// 		isCurrentBlockEditable: currentBlock
	// 			? select( 'quillForms/blocks' ).hasBlockSupport(
	// 					currentBlock.name,
	// 					'editable'
	// 			  )
	// 			: null,
	// 	};
	// } );

	const { answers, currentBlockAnswer } = useSelect( ( select ) => {
		return {
			answers: select( 'quillForms/renderer-core' ).getAnswers(),
			currentBlockAnswer: currentBlockId
				? select( 'quillForms/renderer-core' ).getFieldAnswerVal(
						currentBlockId
				  )
				: null,
		};
	} );

	const handleClickOutside = ( e: MouseEvent ): void => {
		if ( ref.current && ! ref.current.contains( e.target as Node ) ) {
			setIsFocused( false );
		}
	};

	// Attaching the previous event with UseEffect hook
	useEffect( () => {
		// Bind the event listener
		document.addEventListener( 'mousedown', handleClickOutside );
		return () => {
			// Unbind the event listener on clean up
			document.removeEventListener( 'mousedown', handleClickOutside );
		};
	} );

	const isConditionFulfilled = (
		conditionOperator: string,
		conditionVal: unknown,
		fieldValue: unknown
	): boolean => {
		switch ( conditionOperator ) {
			case 'is': {
				if ( Array.isArray( fieldValue ) )
					return fieldValue.includes( conditionVal );

				if (
					typeof conditionVal === 'number' &&
					typeof fieldValue === 'string'
				)
					return parseInt( fieldValue ) === conditionVal;

				return fieldValue === conditionVal;
			}

			case 'is_not': {
				if ( Array.isArray( fieldValue ) )
					return ! fieldValue.includes( conditionVal );

				return fieldValue !== conditionVal;
			}

			case 'greater_than': {
				if (
					typeof fieldValue !== 'number' ||
					typeof conditionVal !== 'number'
				) {
					return false;
				}

				return fieldValue > conditionVal;
			}

			case 'lower_than': {
				if (
					typeof fieldValue !== 'number' ||
					typeof conditionVal !== 'number'
				) {
					return false;
				}

				return fieldValue < conditionVal;
			}

			case 'contains': {
				if (
					typeof fieldValue !== 'string' ||
					typeof conditionVal !== 'string'
				) {
					return false;
				}
				return fieldValue.indexOf( conditionVal ) !== -1;
			}

			case 'starts_with': {
				if (
					typeof fieldValue !== 'string' ||
					typeof conditionVal !== 'string'
				) {
					return false;
				}
				return fieldValue.startsWith( conditionVal );
			}

			case 'ends_with': {
				if (
					typeof fieldValue !== 'string' ||
					typeof conditionVal !== 'string'
				) {
					return false;
				}
				return fieldValue.endsWith( conditionVal );
			}
		}
		return false;
	};

	const getBlockLogic = ( blockId: string ) => {
		if ( ! jumpLogic ) return null;
		return size( jumpLogic ) > 0
			? jumpLogic.find( ( blockLogic ) => blockLogic.blockId === blockId )
			: null;
	};

	const ruleGroupConditionsMet = ( ruleGroupConditions ): boolean => {
		let res = true;
		forEach( ruleGroupConditions, ( condition ) => {
			const { op, vars } = condition;
			const fieldId = vars[ 0 ].value;
			const fieldAnswer = answers[ fieldId ];
			const value = vars[ 1 ].value;
			if ( ! isConditionFulfilled( op, value, fieldAnswer ) ) res = false;
		} );
		return res;
	};

	const conditionsMet = ( conditions ): boolean => {
		let res = false;
		forEach( conditions, ( ruleGroupConditions ) => {
			if ( ruleGroupConditionsMet( ruleGroupConditions ) ) {
				res = true;
			}
		} );
		return res;
	};

	const getNextTarget = ( target: string, conditions ) => {
		if ( conditionsMet( conditions ) ) {
			return target;
		}
		return undefined;
	};

	const getBlockIndex = ( blockId: string | undefined ) => {
		if ( ! blockId ) {
			return -1;
		}
		return blocks.findIndex( ( block ) => block.id === blockId );
	};

	const generatePath = () => {
		const path: FormBlocks = [];
		let nextBlockId: string | undefined;
		let index = 0;

		let shouldBreakTheWholeLoop = false;
		do {
			const question = blocks[ index ];
			if ( question.name === 'welcome-screen' ) {
				index++;
				continue;
			}
			if ( question.name === 'thankyou-screen' ) {
				break;
			}
			path.push( question );
			let newIndex = index;
			const blockJumpLogic = getBlockLogic( question.id );
			if ( blockJumpLogic && blockJumpLogic?.actions?.length > 0 ) {
				let $break = false;
				forEach( blockJumpLogic.actions, ( action ) => {
					if ( ! $break ) {
						if (
							action &&
							action.conditions &&
							size( action.conditions ) > 0 &&
							action.target
						) {
							const nextId = getNextTarget(
								action.target,
								action.conditions
							);
							const nextBlockIndex = getBlockIndex( nextId );
							if ( nextId && nextBlockIndex !== -1 ) {
								if ( nextBlockIndex < index ) {
									shouldBreakTheWholeLoop = true;
								} else {
									newIndex = nextBlockIndex;
								}
								if ( currentBlockId === question.id ) {
									nextBlockId = nextId;
								}
								$break = true;
							}
						}
					}
				} );
				if ( newIndex === index && ! shouldBreakTheWholeLoop ) {
					index++;
				} else {
					index = newIndex;
				}
			} else {
				index++;
			}
			if ( currentBlockId === question.id ) {
				nextBlockId = nextBlockId
					? nextBlockId
					: blocks[ index ]?.id
					? blocks[ index ].id
					: undefined;
			}
			if ( shouldBreakTheWholeLoop ) break;
		} while ( index < blocks.length );

		return { path, nextBlockId };
	};

	useEffect( () => {
		if ( applyLogic ) {
			const { path, nextBlockId } = generatePath();
			setSwiper( {
				walkPath: path,
				nextBlockId,
			} );
		}
	}, [ currentBlockAnswer, currentBlockId ] );

	useEffect( () => {
		if ( applyLogic ) {
			const { path, nextBlockId } = generatePath();
			setSwiper( {
				walkPath: path,
				currentBlockId: blocks[ 0 ].id,
				prevBlockId: undefined,
				canGoPrev: false,
				lastActiveBlockId: undefined,
				nextBlockId,
			} );
		}
	}, [ applyLogic ] );
	return (
		<div
			onWheel={ swipingHandler }
			className={ 'renderer-core-fields-wrapper' }
			ref={ ref }
		>
			{ fields.map( ( field, index ) => {
				const isActive = currentBlockId === field.id;
				return (
					<FieldRender
						key={ `${ field.id }` }
						id={ field.id }
						isFocused={ isFocused }
						setIsFocused={ setIsFocused }
						shouldBeRendered={ fieldsToRender.includes( field.id ) }
						isActive={ isActive }
						isLastField={ index === fields.length - 1 }
					/>
				);
			} ) }
		</div>
	);
};
export default FieldsWrapper;