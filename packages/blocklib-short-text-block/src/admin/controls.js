/**
 * QuillForms Dependencies
 */
import {
	__experimentalBaseControl,
	__experimentalControlWrapper,
	__experimentalControlLabel,
	ToggleControl,
	TextControl,
} from '@quillforms/builder-components';

/**
 * WordPress Dependencies
 */
import { Fragment } from '@wordpress/element';

const shortTextControl = ( { attributes, setAttributes } ) => {
	const { setMaxCharacters, maxCharacters } = attributes;

	return (
		<Fragment>
			<__experimentalBaseControl>
				<__experimentalControlWrapper orientation="horizontal">
					<__experimentalControlLabel label="Max Characters" />
					<ToggleControl
						checked={ setMaxCharacters }
						onChange={ () => {
							setAttributes( {
								setMaxCharacters: ! setMaxCharacters,
							} );
						} }
					/>
				</__experimentalControlWrapper>
				{ setMaxCharacters && (
					<TextControl
						type="number"
						inputProps={ { min: '1', max: '1000000' } }
						placeholder="1-1000000"
						value={ maxCharacters }
						setValue={ ( val ) =>
							setAttributes( {
								maxCharacters: val,
							} )
						}
					/>
				) }
			</__experimentalBaseControl>
		</Fragment>
	);
};
export default shortTextControl;