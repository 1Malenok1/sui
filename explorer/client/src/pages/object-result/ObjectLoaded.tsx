// Copyright (c) 2022, Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useState, useCallback } from 'react';

import Longtext from '../../components/longtext/Longtext';
import theme from '../../styles/theme.module.css';
import { type AddressOwner } from '../../utils/internetapi/SuiRpcClient';
import {
    asciiFromNumberBytes,
    trimStdLibPrefix,
} from '../../utils/stringUtils';
import DisplayBox from './DisplayBox';

import styles from './ObjectResult.module.css';
import { GetObjectInfoResponse } from 'sui.js';


function ObjectLoaded({ data }: { data: GetObjectInfoResponse }) {

    // TODO - remove all '@ts-ignore' when type defs are fixed
    //@ts-ignore
    const suiObj = data.details.object;
    //@ts-ignore
    const objRef = data.details.objectRef;
    const objID = objRef.objectId;

    const [showDescription, setShowDescription] = useState(true);
    const [showProperties, setShowProperties] = useState(false);
    const [showConnectedEntities, setShowConnectedEntities] = useState(false);

    useEffect(() => {
        setShowDescription(true);
        setShowProperties(true);
        setShowConnectedEntities(true);
    }, [setShowDescription, setShowProperties, setShowConnectedEntities]);

    const clickSetShowDescription = useCallback(
        () => setShowDescription(!showDescription),
        [showDescription]
    );
    const clickSetShowProperties = useCallback(
        () => setShowProperties(!showProperties),
        [showProperties]
    );
    const clickSetShowConnectedEntities = useCallback(
        () => setShowConnectedEntities(!showConnectedEntities),
        [showConnectedEntities]
    );
    const prepLabel = (label: string) => label.split('_').join(' ');
    const checkIsPropertyType = (value: any) =>
        ['number', 'string'].includes(typeof value);

    //TODO - a backend convention on how owned objects are labelled and how values are stored
    //This would facilitate refactoring the below and stopping bugs when a variant is missed:
    const checkIsIDType = (key: string, value: any) =>
        /owned/.test(key) ||
        (/_id/.test(key) && value?.bytes) ||
        value?.vec ||
        key === 'objects';
    const checkSingleID = (value: any) => value?.bytes;
    const checkVecIDs = (value: any) => value?.vec;
    const checkVecOfSingleID = (value: any) =>
        Array.isArray(value) && value.length > 0 && value[0]?.bytes;
    const addrOwnerPattern = /^AddressOwner\(k#/;
    const endParensPattern = /\){1}$/;

    //TODO - improve move code handling:
    // const isMoveVecType = (value: { vec?: [] }) => Array.isArray(value?.vec);
    // TODO - merge / replace with other version of same thing
    const stdLibRe = /0x2::/;
    const prepObjTypeValue = (typeString: string) =>
        typeString.replace(stdLibRe, '');

    const extractOwnerData = (owner: string | AddressOwner): string => {
        switch (typeof owner) {
            case 'string':
                if (addrOwnerPattern.test(owner)) {
                    let ownerId = getAddressOwnerId(owner);
                    return ownerId ? ownerId : '';
                }
                const singleOwnerPattern = /SingleOwner\(k#(.*)\)/;
                const result = singleOwnerPattern.exec(owner);
                return result ? result[1] : '';
            case 'object':
                if ('AddressOwner' in owner) {
                    let ownerId = extractAddressOwner(owner.AddressOwner);
                    return ownerId ? ownerId : '';
                }
                return '';
            default:
                return '';
        }
    };
    const getAddressOwnerId = (addrOwner: string): string | null => {
        if (
            !addrOwnerPattern.test(addrOwner) ||
            !endParensPattern.test(addrOwner)
        )
            return null;

        let str = addrOwner.replace(addrOwnerPattern, '');
        return str.replace(endParensPattern, '');
    };

    const extractAddressOwner = (addrOwner: number[]): string | null => {
        if (addrOwner.length !== 20) {
            console.log('address owner byte length must be 20');
            return null;
        }

        return asciiFromNumberBytes(addrOwner);
    };

    function toHexString(byteArray: number[]): string {
        return (
            '0x' +
            Array.prototype.map
                .call(byteArray, (byte) => {
                    return ('0' + (byte & 0xff).toString(16)).slice(-2);
                })
                .join('')
        );
    }

    function processOwner(owner: any) {
        if (typeof owner === 'object' && 'AddressOwner' in owner) {
            return toHexString(owner.AddressOwner);
        }

        return owner;
    }

    const viewedData = {
        ...data,
        objType: trimStdLibPrefix(suiObj.objType),
        name: suiObj.name,
        //tx_digest:
        //    data.data.tx_digest && typeof data.data.tx_digest === 'object'
        //        ? toHexString(data.data.tx_digest as number[])
        //        : data.data.tx_digest,
        owner: processOwner(suiObj),
    };

    //TO DO remove when have distinct name field under Description
    const nameKeyValue = Object.entries(suiObj)
        .filter(([key, _]) => /name/i.test(key))
        .map(([_, value]) => value);

    const ownedObjects: [string, any][] = Object.entries(suiObj).filter(
        ([key, value]) => checkIsIDType(key, value)
    );

    const properties: [string, any][] = Object.entries(suiObj)
        //TO DO: remove when have distinct 'name' field in Description
        .filter(([key, _]) => !/name/i.test(key))
        .filter(([_, value]) => checkIsPropertyType(value))
        // TODO: 'display' is a object property added during demo, replace with metadata ptr?
        .filter(([key, _]) => key !== 'display');

    return (
        <>
            <div className={styles.resultbox}>
                {suiObj?.display && (
                    <DisplayBox data={data} />
                )}
                <div
                    className={`${styles.textbox} ${
                        suiObj?.display
                            ? styles.accommodate
                            : styles.noaccommodate
                    }`}
                >
                    {suiObj.name && <h1>{suiObj.name}</h1>} {' '}
                    {typeof nameKeyValue[0] === 'string' && (
                        <h1>{nameKeyValue}</h1>
                    )}
                    <h2
                        className={styles.clickableheader}
                        onClick={clickSetShowDescription}
                    >
                        Description {showDescription ? '' : '+'}
                    </h2>
                    {showDescription && (
                        <div className={theme.textresults}>
                            <div>
                                <div>Object ID</div>
                                <div>
                                    <Longtext
                                        text={objID}
                                        category="objects"
                                        isLink={false}
                                    />
                                </div>
                            </div>

                            <div>
                                <div>Version</div>
                                <div>{objRef.version}</div>
                            </div>

                            {suiObj.readonly && (
                                <div>
                                    <div>Read Only?</div>
                                    {suiObj.readonly === 'true' ? (
                                        <div
                                            data-testid="read-only-text"
                                            className={styles.immutable}
                                        >
                                            True
                                        </div>
                                    ) : (
                                        <div
                                            data-testid="read-only-text"
                                            className={styles.mutable}
                                        >
                                            False
                                        </div>
                                    )}
                                </div>
                            )}

                            <div>
                                <div>Type</div>
                                <div>{prepObjTypeValue(suiObj.objType)}</div>
                            </div>
                            <div>
                                <div>Owner</div>
                                <Longtext
                                    text={extractOwnerData(suiObj.owner)}
                                    category="unknown"
                                    isLink={true}
                                />
                            </div>
                            {suiObj.contract_id && (
                                <div>
                                    <div>Contract ID</div>
                                    <Longtext
                                        text={suiObj.contract_id.bytes}
                                        category="objects"
                                        isLink={true}
                                    />
                                </div>
                            )}

                            {suiObj.ethAddress && (
                                <div>
                                    <div>Ethereum Contract Address</div>
                                    <div>
                                        <Longtext
                                            text={suiObj.ethAddress}
                                            category="ethAddress"
                                            isLink={true}
                                        />
                                    </div>
                                </div>
                            )}
                            {suiObj.ethTokenId && (
                                <div>
                                    <div>Ethereum Token ID</div>
                                    <div>
                                        <Longtext
                                            text={suiObj.ethTokenId}
                                            category="addresses"
                                            isLink={false}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    {properties.length > 0 && (
                        <>
                            <h2
                                className={styles.clickableheader}
                                onClick={clickSetShowProperties}
                            >
                                Properties {showProperties ? '' : '+'}
                            </h2>
                            {showProperties &&  (
                                <div className={styles.propertybox}>
                                    {properties.map(([key, value], index) => (
                                        <div key={`property-${index}`}>
                                            <p>{prepLabel(key)}</p>
                                            <p>{value}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                    {ownedObjects.length > 0 && (
                        <>
                            <h2
                                className={styles.clickableheader}
                                onClick={clickSetShowConnectedEntities}
                            >
                                Owned Objects {showConnectedEntities ? '' : '+'}
                            </h2>
                            {showConnectedEntities && (
                                <div className={theme.textresults}>
                                    {ownedObjects.map(
                                        ([key, value], index1) => (
                                            <div
                                                key={`ConnectedEntity-${index1}`}
                                            >
                                                <div>{prepLabel(key)}</div>
                                                {checkSingleID(value) && (
                                                    <Longtext
                                                        text={value.bytes}
                                                        category="objects"
                                                    />
                                                )}
                                                {checkVecIDs(value) && (
                                                    <div>
                                                        {value?.vec.map(
                                                            (
                                                                value2: {
                                                                    bytes: string;
                                                                },
                                                                index2: number
                                                            ) => (
                                                                <Longtext
                                                                    text={
                                                                        value2.bytes
                                                                    }
                                                                    category="objects"
                                                                    key={`ConnectedEntity-${index1}-${index2}`}
                                                                />
                                                            )
                                                        )}
                                                    </div>
                                                )}
                                                {checkVecOfSingleID(value) && (
                                                    <div>
                                                        {value.map(
                                                            (
                                                                value2: {
                                                                    bytes: string;
                                                                },
                                                                index2: number
                                                            ) => (
                                                                <Longtext
                                                                    text={
                                                                        value2.bytes
                                                                    }
                                                                    category="objects"
                                                                    key={`ConnectedEntity-${index1}-${index2}`}
                                                                />
                                                            )
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </>
    );
}

export default ObjectLoaded;
